import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Review } from "../entities/review.entity";
import { Restaurant } from "../entities/restaurant.entity";
import { SentimentResult, SentimentService } from "./sentiment.service";
import { KeywordExtractionService } from "./keyword-extraction.service";

import { parse } from "csv-parse/sync";

type ReviewSource = "user" | "crawl";

interface CreateReviewDto {
  text: string;
  restaurant_id: string | number;
  user_id?: string;
  source: ReviewSource;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly sentimentService: SentimentService,
    private readonly keywordExtractionService: KeywordExtractionService,

    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async createReview(dto: CreateReviewDto) {
    const { text, restaurant_id, user_id, source } = dto;
    const restaurantId = Number(restaurant_id);

    this.logger.log(`📝 리뷰 생성 요청 (restaurant_id=${restaurantId}, user_id=${user_id}, source=${source})`);

    if (!text?.trim()) throw new BadRequestException("리뷰 텍스트는 비어 있을 수 없습니다.");
    if (!Number.isFinite(restaurantId) || restaurantId <= 0)
      throw new BadRequestException("유효한 restaurant_id를 제공해야 합니다.");
    if (source !== "user" && source !== "crawl")
      throw new BadRequestException("source는 'user' 또는 'crawl'이어야 합니다.");

    let sentimentResult: SentimentResult | null = null;
    try {
      sentimentResult = await this.sentimentService.analyze(text, String(restaurantId), source, user_id);
    } catch (error) {
      this.logger.error("❌ 감성 분석 중 오류:", error);
    }

    const review = this.reviewRepo.create({
      text,
      restaurant_id: restaurantId,
      user_id,
      source,
      sentiment: sentimentResult?.sentiment,
      score: sentimentResult?.score,
      emoji: sentimentResult?.emoji,
      percent: sentimentResult?.percent,
      raw: sentimentResult?.raw,
    } as Partial<Review>);

    const savedReview = await this.reviewRepo.save(review);

    try {
      await this.keywordExtractionService.runExtractorScript(restaurantId);
      this.logger.log(`✅ 키워드 추출 및 Map 최신화 완료 (restaurant_id=${restaurantId})`);
    } catch (err) {
      this.logger.warn(`⚠️ 키워드 추출 실패 (restaurant_id=${restaurantId})`, err as any);
    }

    return { message: "리뷰 분석 및 저장 완료", data: savedReview };
  }

  async uploadCsv(file: Express.Multer.File, preMatchedRestaurantId?: number) {
    if (!file || !file.buffer) {
      throw new BadRequestException("CSV 파일이 없거나 메모리 업로드 형식이 아닙니다.");
    }

    // ✅ CSV 파싱
    let rows: any[];
    try {
      rows = parse(file.buffer, {
        columns: true,
        bom: true,
        trim: true,
        skip_empty_lines: true,
      });
    } catch (e: any) {
      this.logger.error("CSV 파싱 실패", e?.stack ?? e);
      throw new BadRequestException(`CSV 파싱 오류: ${e?.message ?? e}`);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { inserted: 0, analyzed: 0, skipped: 0, errors: [] as string[] };
    }

    const normalize = (s?: string) => (s ?? "").normalize("NFC").replace(/\u200B/g, "").trim();
    const noSpaceLower = (s?: string) => normalize(s).replace(/\s+/g, "").toLowerCase();

    const findRestaurantByName = async (rawName: string) => {
      const n = normalize(rawName);
      if (!n) return null;
      const nLower = n.toLowerCase();
      const nsLower = noSpaceLower(n);

      const exact = await this.restaurantRepo
        .createQueryBuilder("r")
        .where("LOWER(r.name) = :n", { n: nLower })
        .orWhere("REPLACE(LOWER(r.name), ' ', '') = :ns", { ns: nsLower })
        .getOne();
      if (exact) return exact;

      const candidates = await this.restaurantRepo
        .createQueryBuilder("r")
        .where("LOWER(r.name) LIKE :kw OR REPLACE(LOWER(r.name), ' ', '') LIKE :kw2", {
          kw: `%${nLower}%`,
          kw2: `%${nsLower}%`,
        })
        .limit(5)
        .getMany();

      if (candidates.length === 1) return candidates[0];
      return null;
    };

    let inserted = 0;
    let analyzed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const touchedRestaurantIds = new Set<number>();

    for (const [idx, row] of rows.entries()) {
      try {
        const text: string =
          row.text ?? row["리뷰"] ?? row["내용"] ?? row["comment"] ?? row["text"] ?? "";
        const source: ReviewSource =
          (row.source ?? row["source"] ?? "user") as ReviewSource;
        const user_id: string | undefined = row.user_id ?? row["user_id"];

        if (!text?.trim()) {
          skipped++;
          continue;
        }
        if (source !== "user" && source !== "crawl") {
          throw new BadRequestException(`Row ${idx + 1}: source는 'user' | 'crawl'이어야 합니다.`);
        }

        let restaurantId: number | undefined =
          preMatchedRestaurantId ?? Number(row.restaurant_id ?? row["restaurantId"]);

        if (!restaurantId || !Number.isFinite(restaurantId) || restaurantId <= 0) {
          const byName = row["가게이름"] ?? row["restaurant_name"] ?? row["name"];
          if (!byName) {
            throw new BadRequestException(`Row ${idx + 1}: restaurant_id 또는 가게이름 컬럼이 필요합니다.`);
          }
          const found = await findRestaurantByName(String(byName));
          if (!found) {
            throw new BadRequestException(`Row ${idx + 1}: 가게이름 '${byName}'에 해당하는 레스토랑을 찾을 수 없습니다.`);
          }
          restaurantId = found.id;
        }

        let s: SentimentResult | null = null;
        try {
          s = await this.sentimentService.analyze(text, String(restaurantId), source, user_id);
          analyzed++;
        } catch (e) {
          this.logger.warn(`Row ${idx + 1}: 감성분석 실패 → 저장은 계속 진행`, e as any);
        }

        await this.reviewRepo.save({
          text,
          restaurant_id: restaurantId,
          user_id,
          source,
          sentiment: s?.sentiment,
          score: s?.score,
          emoji: s?.emoji,
          percent: s?.percent,
          raw: s?.raw,
        } as Partial<Review>);

        inserted++;
        touchedRestaurantIds.add(restaurantId);
      } catch (e: any) {
        errors.push(e?.message ?? String(e));
      }
    }

    for (const rid of touchedRestaurantIds) {
      try {
        await this.keywordExtractionService.runExtractorScript(rid);
      } catch {
        this.logger.warn(`키워드 추출 실패 (restaurant_id=${rid})`);
      }
    }

    return { inserted, analyzed, skipped, errors };
  }
}

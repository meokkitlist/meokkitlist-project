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
  restaurant_id?: string | number | null;  // ✅ optional & null 허용
  user_id?: string | null;
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

    this.logger.log(`📝 리뷰 생성 요청 (restaurant_id=${restaurant_id}, user_id=${user_id}, source=${source})`);

    if (!text?.trim()) throw new BadRequestException("리뷰 텍스트는 비어 있을 수 없습니다.");
    if (source !== "user" && source !== "crawl")
      throw new BadRequestException("source는 'user' 또는 'crawl'이어야 합니다.");

    // ✅ restaurant_id 처리 (없으면 null)
    const restaurantId =
      restaurant_id != null && Number.isFinite(Number(restaurant_id)) && Number(restaurant_id) > 0
        ? Number(restaurant_id)
        : null;

    let sentimentResult: SentimentResult | null = null;
    try {
      sentimentResult = await this.sentimentService.analyze(
        text,
        restaurantId ? String(restaurantId) : "unknown",
        source,
        user_id ?? undefined,
      );
    } catch (error) {
      this.logger.error("❌ 감성 분석 중 오류:", error);
    }

    const review = this.reviewRepo.create({
      text,
      restaurant_id: restaurantId,
      user_id: user_id ?? null,
      source,
      sentiment: sentimentResult?.sentiment ?? null,
      score: sentimentResult?.score ?? null,
      emoji: sentimentResult?.emoji ?? null,
      percent: sentimentResult?.percent ?? null,
      raw: sentimentResult?.raw ?? null,
    } as Partial<Review>);

    const savedReview = await this.reviewRepo.save(review);

    // ✅ restaurant_id가 있을 때만 키워드 추출 실행
    if (restaurantId) {
      try {
        await this.keywordExtractionService.runExtractorScript(restaurantId);
        this.logger.log(`✅ 키워드 추출 및 Map 최신화 완료 (restaurant_id=${restaurantId})`);
      } catch (err) {
        this.logger.warn(`⚠️ 키워드 추출 실패 (restaurant_id=${restaurantId})`, err as any);
      }
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
        const source: ReviewSource = (row.source ?? row["source"] ?? "user") as ReviewSource;
        const user_id: string | undefined = row.user_id ?? row["user_id"];

        if (!text?.trim()) {
          skipped++;
          continue;
        }
        if (source !== "user" && source !== "crawl") {
          throw new BadRequestException(`Row ${idx + 1}: source는 'user' | 'crawl'이어야 합니다.`);
        }

        // ✅ restaurant_id 우선 적용
        let restaurantId: number | null =
          preMatchedRestaurantId ?? (row.restaurant_id ? Number(row.restaurant_id) : null);

        // ✅ 매칭 실패 시 가게이름 기반 조회 → 그래도 없으면 null 저장
        if (!restaurantId || !Number.isFinite(restaurantId) || restaurantId <= 0) {
          const byName = row["가게이름"] ?? row["restaurant_name"] ?? row["name"];
          if (byName) {
            const found = await findRestaurantByName(String(byName));
            if (found) {
              restaurantId = found.id;
            } else {
              this.logger.warn(`Row ${idx + 1}: 가게이름 '${byName}' 매칭 실패 → restaurant_id=null 저장`);
              restaurantId = null; // ✅ 매칭 실패해도 null로 저장
            }
          } else {
            restaurantId = null; // ✅ restaurant_id도 없고 이름도 없으면 null
          }
        }

        let s: SentimentResult | null = null;
        try {
          s = await this.sentimentService.analyze(text, restaurantId ? String(restaurantId) : "unknown", source, user_id);
          analyzed++;
        } catch (e) {
          this.logger.warn(`Row ${idx + 1}: 감성분석 실패 → 저장은 계속 진행`, e as any);
        }

        await this.reviewRepo.save({
          text,
          restaurant_id: restaurantId,
          user_id: user_id ?? null,
          source,
          sentiment: s?.sentiment ?? null,
          score: s?.score ?? null,
          emoji: s?.emoji ?? null,
          percent: s?.percent ?? null,
          raw: s?.raw ?? null,
        } as Partial<Review>);

        inserted++;
        if (restaurantId) touchedRestaurantIds.add(restaurantId);
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

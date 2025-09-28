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
  restaurant_id?: string | number | null;
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

    this.logger.log(
      `📝 리뷰 생성 요청 (restaurant_id=${restaurant_id}, user_id=${user_id}, source=${source})`,
    );

    if (!text?.trim())
      throw new BadRequestException("리뷰 텍스트는 비어 있을 수 없습니다.");
    if (source !== "user" && source !== "crawl")
      throw new BadRequestException("source는 'user' 또는 'crawl'이어야 합니다.");

    const restaurantId =
      restaurant_id != null &&
      Number.isFinite(Number(restaurant_id)) &&
      Number(restaurant_id) > 0
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

    if (restaurantId) {
      try {
        await this.keywordExtractionService.runExtractorScript(restaurantId);
        this.logger.log(
          `✅ 키워드 추출 및 Map 최신화 완료 (restaurant_id=${restaurantId})`,
        );
      } catch (err) {
        this.logger.warn(
          `⚠️ 키워드 추출 실패 (restaurant_id=${restaurantId})`,
          err as any,
        );
      }
    }

    return { message: "리뷰 분석 및 저장 완료", data: savedReview };
  }
}

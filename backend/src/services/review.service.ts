import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Review } from "../entities/review.entity";
import { SentimentResult, SentimentService } from "./sentiment.service";
import { KeywordExtractionService } from "./keyword-extraction.service";

interface CreateReviewDto {
  text: string;
  restaurant_id: string;
  user_id?: string;
  source: "user" | "crawl";
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly sentimentService: SentimentService,
    private readonly keywordExtractionService: KeywordExtractionService,

    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async createReview(dto: CreateReviewDto) {
    const { text, restaurant_id, user_id, source } = dto;
    const restaurantId = Number(restaurant_id);
    this.logger.log(
      `📝 리뷰 생성 요청 (restaurant_id=${restaurantId}, user_id=${user_id}, source=${source})`,
    );

    if (!text || text.trim().length === 0) {
      throw new Error("리뷰 텍스트는 비어 있을 수 없습니다.");
    }
    if (isNaN(restaurantId) || restaurantId <= 0) {
      throw new Error("유효한 restaurant_id를 제공해야 합니다.");
    }
    if (source !== "user" && source !== "crawl") {
      throw new Error("source는 'user' 또는 'crawl'이어야 합니다.");
    }

    // ✅ 감성 분석
    let sentimentResult: SentimentResult;
    try {
      sentimentResult = await this.sentimentService.analyze(
        text,
        String(restaurantId),
        source,
        user_id,
      );
    } catch (error) {
      this.logger.error("❌ 감성 분석 중 오류:", error);
      throw new Error("리뷰 감성 분석에 실패했습니다.");
    }

    // ✅ 리뷰 객체 생성 및 저장
    const review = this.reviewRepo.create({
      text,
      restaurant_id: restaurantId,
      user_id,
      source,
      sentiment: sentimentResult.sentiment,
      score: sentimentResult.score,
      emoji: sentimentResult.emoji,
      percent: sentimentResult.percent,
      raw: sentimentResult.raw,
    } as Partial<Review>);

    const savedReview = await this.reviewRepo.save(review);

    // ✅ 리뷰 저장 후 키워드 추출 및 Map 최신화
    try {
      await this.keywordExtractionService.runExtractorScript(restaurantId);
      this.logger.log(
        `✅ 키워드 추출 및 Map 최신화 완료 (restaurant_id=${restaurantId})`,
      );
    } catch (err) {
      this.logger.warn(
        `⚠️ 키워드 추출 실패 (restaurant_id=${restaurantId})`,
        err,
      );
    }

    return {
      message: "리뷰 분석 및 저장 완료",
      data: savedReview,
    };
  }
}
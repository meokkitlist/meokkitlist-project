import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { SentimentResult, SentimentService } from './sentiment.service';
import { KeywordExtractionService } from './keyword-extraction.service';
import { parse } from 'csv-parse/sync';
import * as path from 'path';

type ReviewSource = 'user' | 'crawl';

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

  /**
   * 단일 리뷰 생성
   */
  async createReview(dto: CreateReviewDto): Promise<Review> {
    const { text, restaurant_id, user_id, source } = dto;

    this.logger.log(
      `📝 리뷰 생성 요청 (restaurant_id=${restaurant_id}, user_id=${user_id}, source=${source})`,
    );

    if (!text?.trim()) {
      throw new BadRequestException('리뷰 텍스트는 비어 있을 수 없습니다.');
    }
    if (source !== 'user' && source !== 'crawl') {
      throw new BadRequestException("source는 'user' 또는 'crawl'이어야 합니다.");
    }

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
        restaurantId ? String(restaurantId) : 'unknown',
        source,
        user_id ?? undefined,
      );
    } catch (error) {
      this.logger.error('❌ 감성 분석 중 오류:', error);
    }

    // 실패 시 fallback 값
    const review = this.reviewRepo.create({
      text,
      restaurant_id: restaurantId,
      user_id: user_id ?? null,
      source,
      sentiment: sentimentResult?.sentiment ?? 'Unknown',
      score: sentimentResult?.score ?? 0,
      emoji: sentimentResult?.emoji ?? null, // DB에는 저장되지만 응답시 무시됨
      percent: sentimentResult?.percent ?? null,
      raw: sentimentResult?.raw ?? null,
    } as Partial<Review>);

    const savedReview = await this.reviewRepo.save(review);

    // ✅ 키워드 추출
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

    return savedReview; // ✅ 엔티티만 반환
  }

  /**
   * CSV 업로드 → 리뷰 일괄 저장
   * - 파일명: 리뷰_<식당명>_YYYYMMDD.csv
   * - restaurant_id 없으면: 파일명에서 식당명 추출 후 DB 매핑
   */
  async uploadCsv(buffer: Buffer, filename: string, source: ReviewSource = 'crawl') {
    const rows: any[] = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
    });

    // 파일명에서 식당 이름 추출
    const baseName = path.basename(filename, '.csv');
    const storeName = baseName.replace(/^리뷰_/, '').replace(/_\d+$/, '').trim();

    let restaurant = await this.restaurantRepo.findOne({ where: { name: storeName } });
    if (!restaurant) {
      this.logger.warn(`⚠️ 매칭 실패 → DB에 없는 식당: ${storeName}`);
      // 없으면 자동 생성
      restaurant = this.restaurantRepo.create({
        name: storeName,
        address: '',
        review_count: 0,
        total_score: 0,
        sentiment_score: 0,
        keywords: [],
      });
      restaurant = await this.restaurantRepo.save(restaurant);
      this.logger.log(`➕ 새 식당 생성: ${restaurant.name} (id=${restaurant.id})`);
    }

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const text = String(row.review ?? row.text ?? '').trim();
      if (!text) {
        failed++;
        continue;
      }

      try {
        await this.createReview({
          text,
          restaurant_id: restaurant.id,
          source,
        });
        success++;
      } catch (e) {
        failed++;
        this.logger.error(`❌ 리뷰 저장 실패: ${text.slice(0, 30)}...`, e as any);
      }
    }

    // ✅ 업로드 후 집계 업데이트
    await this.aggregateRestaurantStats(restaurant.id);

    return {
      message: 'CSV 업로드 및 저장 완료',
      total: rows.length,
      success,
      failed,
    };
  }

  /**
   * 특정 식당의 리뷰 기반 집계 (review_count, total_score, sentiment_score)
   */
  async aggregateRestaurantStats(restaurantId: number) {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'cnt')
      .addSelect('AVG(r.score)', 'avg_score')
      .addSelect('AVG(r.score)', 'avg_sentiment') // 필요시 sentiment 별도 처리
      .where('r.restaurant_id = :id', { id: restaurantId })
      .getRawOne();

    await this.restaurantRepo.update(restaurantId, {
      review_count: Number(result.cnt) || 0,
      total_score: Number(result.avg_score) || 0,
      sentiment_score: Number(result.avg_sentiment) || 0,
    });

    this.logger.log(
      `📊 집계 갱신 완료 (restaurant_id=${restaurantId}, count=${result.cnt})`,
    );
  }
}

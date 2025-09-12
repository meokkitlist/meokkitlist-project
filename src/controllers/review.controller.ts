// src/controllers/review.controller.ts
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewService } from '../services/review.service';
import { SentimentService } from '../services/sentiment.service';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Express } from 'express';
import { Multer } from 'multer';

// ✅ 요청 바디 타입 정의
interface CreateReviewDto {
  text: string;
  restaurant_id: string;
  user_id?: string;
  source: 'user' | 'crawl';
}

// ✅ 키워드 확장 요청 DTO
interface ExpandKeywordDto {
  keyword: string;
}

@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly sentimentService: SentimentService,
  ) {}

  // ✅ 단일 리뷰 생성
  @Post('create')
  async createReview(@Body() body: CreateReviewDto) {
    return this.reviewService.createReview(body);
  }

  // ✅ 키워드 확장 테스트용
  @Post('expand-keyword')
  async expandKeyword(@Body() body: ExpandKeywordDto) {
    const keywords = await this.sentimentService.expandKeywords(body.keyword);
    return { keywords };
  }

  // ✅ CSV 업로드 및 배치 저장
  @Post('upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { message: 'CSV 파일이 업로드되지 않았습니다.' };
    }

    const results: Record<string, string>[] = [];
    const stream = Readable.from(file.buffer);

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          // === 전처리 규칙 ===
          if (row.review) {
            row.review = row.review.trim();
          }
          if (row.review && row.review.length > 0) {
            results.push(row);
          }
        })
        .on('end', async () => {
          let successCount = 0;
          let failCount = 0;

          for (const row of results) {
            try {
              await this.reviewService.createReview({
                text: row.review,
                restaurant_id: row.restaurant_id ?? '0', // CSV에 없으면 기본값
                user_id: undefined,
                source: 'crawl',
              });
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          resolve({
            message: 'CSV 업로드 및 저장 완료',
            total: results.length,
            success: successCount,
            failed: failCount,
          });
        })
        .on('error', (err: Error) => {
          reject({ message: 'CSV 파싱 오류', error: err.message });
        });
    });
  }
}

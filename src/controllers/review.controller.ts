// src/controllers/review.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import csv from "csv-parser";
import * as fs from "fs";
import * as path from "path";
import { diskStorage } from "multer";
import type { Express } from "express";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Readable } from "stream";

import { ReviewService } from "../services/review.service";
import { SentimentService } from "../services/sentiment.service";

// =====================
// Swagger DTOs & Types
// =====================
export enum ReviewSource {
  USER = "user",
  CRAWL = "crawl",
}

export class CreateReviewDto {
  @ApiProperty({ description: "리뷰 텍스트", example: "맛있고 친절합니다." })
  @IsString()
  text!: string;

  @ApiProperty({ description: "가게 ID", example: "123" })
  @IsString()
  restaurant_id!: string;

  @ApiPropertyOptional({ description: "작성자 사용자 ID", example: "u_42" })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    enum: ReviewSource,
    description: "리뷰 소스",
    example: ReviewSource.CRAWL,
  })
  @IsEnum(ReviewSource)
  source!: ReviewSource;
}

export class ExpandKeywordDto {
  @ApiProperty({ description: "기준 키워드", example: "분위기" })
  @IsString()
  keyword!: string;
}

// ==============
// Upload config
// ==============
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "csv");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@ApiTags("Review")
@Controller("review")
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly sentimentService: SentimentService,
  ) {
    ensureDir(UPLOAD_DIR);
  }

  // ✅ 단일 리뷰 생성
  @Post("create")
  @ApiOperation({ summary: "단일 리뷰 생성" })
  @ApiCreatedResponse({ description: "리뷰 생성 성공" })
  async createReview(@Body() body: CreateReviewDto) {
    return this.reviewService.createReview(body);
  }

  // ✅ 키워드 확장 테스트용
  @Post("expand-keyword")
  @ApiOperation({ summary: "키워드 확장" })
  @ApiOkResponse({ description: "확장된 키워드 목록 반환" })
  async expandKeyword(@Body() body: ExpandKeywordDto) {
    const keywords = await this.sentimentService.expandKeywords(body.keyword);
    return { keywords };
  }

  // ✅ CSV 업로드 및 배치 저장 (Swagger 파일 업로드 지원)
  @Post("upload-csv")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(UPLOAD_DIR);
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const ext = path.extname(file.originalname) || ".csv";
          cb(null, `review_${ts}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === "text/csv" ||
          file.originalname.toLowerCase().endsWith(".csv");
        cb(
          ok ? null : new BadRequestException("CSV 파일만 업로드 가능합니다."),
          ok,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOperation({ summary: "CSV 업로드(리뷰 배치 저장)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "리뷰 CSV 업로드 (컬럼 예: review, restaurant_id)",
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiOkResponse({
    description: "CSV 업로드 및 저장 결과",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "CSV 업로드 및 저장 완료" },
        total: { type: "number", example: 100 },
        success: { type: "number", example: 98 },
        failed: { type: "number", example: 2 },
      },
    },
  })
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path) {
      throw new BadRequestException("파일 업로드 실패");
    }

    const results: Record<string, string>[] = [];

    try {
      // CSV 파싱
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(file.path, { encoding: "utf8" })
          .pipe(csv())
          .on("data", (row: Record<string, string>) => {
            // 간단 전처리
            if (row.review) row.review = row.review.trim();
            if (row.review && row.review.length > 0) {
              results.push(row);
            }
          })
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err));
      });

      // 배치 저장
      let successCount = 0;
      let failCount = 0;

      for (const row of results) {
        try {
          await this.reviewService.createReview({
            text: row.review,
            restaurant_id: row.restaurant_id ?? "0",
            user_id: undefined,
            source: ReviewSource.CRAWL,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      return {
        message: "CSV 업로드 및 저장 완료",
        total: results.length,
        success: successCount,
        failed: failCount,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `CSV 파싱 오류: ${error?.message ?? error}`,
      );
    } finally {
      // 업로드 파일 정리
      try {
        await fs.promises.unlink(file.path);
      } catch {
        /* ignore */
      }
    }
  }
}
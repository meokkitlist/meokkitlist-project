// src/controllers/review.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Logger,
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
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { ReviewService } from "../services/review.service";
import { SentimentService } from "../services/sentiment.service";
import { RestaurantService } from "../services/restaurant.service";

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
  private readonly logger = new Logger(ReviewController.name);
  constructor(
    private readonly reviewService: ReviewService,
    private readonly sentimentService: SentimentService,
    private readonly restaurantService: RestaurantService,
    // 추가
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

    // 한글 파일명 인코딩 복원
    const rawFilename = file.originalname;
    const decodedFilename = decodeURIComponent(escape(rawFilename));
    const filename = path.basename(decodedFilename);

    // 파일명에서 가게이름 추출: "리뷰_가게이름_날짜.csv"
    const match = filename.match(/^리뷰_(.+?)_\d{4}-\d{2}-\d{2}\.csv$/);
    const storeName = match ? match[1] : null;
    if (!storeName) {
      throw new BadRequestException(
        "파일명에서 가게이름을 추출할 수 없습니다. (예: 리뷰_가게이름_날짜.csv)",
      );
    }

    // 가게이름으로 restaurant_id 조회
    const restaurant = await this.restaurantService.findByName(storeName);
    if (!restaurant) {
      throw new BadRequestException(
        `가게이름 "${storeName}"에 해당하는 레스토랑을 찾을 수 없습니다.`,
      );
    }
    const restaurantId = String(restaurant.id);
    this.logger.log("✅ 매칭된 restaurant_id:", restaurantId);

    // CSV 파싱 및 리뷰 저장
    const results: Record<string, string>[] = [];
    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(file.path, { encoding: "utf8" })
          .pipe(
            csv({
              headers: ["review"], // 첫 줄을 헤더로 인식, 이후 줄은 review 컬럼
              separator: ",",
              mapHeaders: ({ header }) => header.trim(),
              mapValues: ({ value }) => value?.trim(),
            }),
          )
          .on("data", (row: Record<string, string>) => {
            // row.review에 리뷰가 들어옴
            if (row.review && row.review.length > 0) {
              results.push({ review: row.review });
            }
          })
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err));
      });

      let successCount = 0;
      let failCount = 0;
      const savedReviews: any[] = [];
      const failedReviews: { review: string; error: string }[] = [];
      this.logger.log(`📊 총 ${results.length}개의 리뷰를 파싱했습니다.`);
      for (const row of results) {
        try {
          const res = await this.reviewService.createReview({
            text: row.review,
            restaurant_id: restaurantId,
            user_id: undefined,
            source: ReviewSource.CRAWL,
          });
          savedReviews.push(res.data);
          successCount++;
        } catch (err: any) {
          this.logger.warn(
            `❌ 리뷰 저장 실패: "${row.review}"\n에러: ${err?.message ?? err}`,
          );
          failedReviews.push({
            review: row.review,
            error: err?.message ?? String(err),
          });
          failCount++;
        }
      }

      return {
        message: "CSV 업로드 및 저장 완료",
        total: results.length,
        success: successCount,
        failed: failCount,
        savedReviews,
        failedReviews,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `CSV 파싱 오류: ${error?.message ?? error}`,
      );
    } finally {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        /* ignore */
      }
    }
  }
}
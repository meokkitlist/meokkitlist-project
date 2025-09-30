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
import { memoryStorage } from "multer";
import { Express } from "express";
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
import { parse } from "csv-parse/sync";

import { ReviewService } from "../services/review.service";
import { RestaurantService } from "../services/restaurant.service";
import { ReviewDto } from "../dto/review.dto";

export enum ReviewSource {
  USER = "user",
  CRAWL = "crawl",
}

export class CreateReviewDto {
  @ApiProperty({ description: "리뷰 텍스트", example: "맛있고 친절합니다." })
  @IsString()
  text!: string;

  @ApiPropertyOptional({
    description: "가게 ID (없을 수도 있음)",
    example: "123",
  })
  @IsOptional()
  restaurant_id?: string | number;

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

@ApiTags("Review")
@Controller("review")
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);
  constructor(
    private readonly reviewService: ReviewService,
    private readonly restaurantService: RestaurantService,
  ) {}

  @Post("create")
  @ApiOperation({ summary: "단일 리뷰 생성" })
  @ApiCreatedResponse({ description: "리뷰 생성 성공" })
  async createReview(@Body() body: CreateReviewDto) {
    const entity = await this.reviewService.createReview(body);
    return new ReviewDto(entity); // ✅ 항상 DTO로 감싸서 반환
  }

  @Post("upload-csv")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === "text/csv" ||
          file.originalname.toLowerCase().endsWith(".csv");
        cb(
          ok ? null : new BadRequestException("CSV 파일만 업로드 가능합니다."),
          ok,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "CSV 업로드(리뷰 배치 저장)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "리뷰 CSV 업로드 (컬럼 예: text, source 또는 review)",
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
    if (!file?.buffer) {
      throw new BadRequestException("파일 업로드 실패: buffer가 비어있습니다.");
    }

    const rawFilename = file.originalname || "";
    const safeFilename = Buffer.from(rawFilename, "latin1").toString("utf8");
    this.logger.log(
      `📂 업로드된 파일명: ${safeFilename}, size=${file.buffer.length}`,
    );

    const patterns = [
      /^리뷰_(.+?)_\d{4}-\d{2}-\d{2}\.csv$/i,
      /^리뷰_(.+?)_\d{8}\.csv$/i,
      /^리뷰_(.+?)\.csv$/i,
    ];

    let storeName: string | null = null;
    for (const re of patterns) {
      const m = safeFilename.match(re);
      if (m) {
        storeName = m[1].trim();
        break;
      }
    }

    if (!storeName) {
      throw new BadRequestException(
        '파일명 규칙을 확인해주세요. 예: "리뷰_가게이름_2025-09-21.csv"',
      );
    }

    const restaurant = await this.restaurantService.getOrCreateRestaurantByName(storeName);
    const restaurantId = String(restaurant.id);

    let rows: any[] = [];
    try {
      rows = parse(file.buffer, {
        columns: true,
        bom: true,
        trim: true,
        skip_empty_lines: true,
      });
    } catch (error: any) {
      throw new BadRequestException(
        `CSV 파싱 오류: ${error?.message ?? String(error)}`,
      );
    }

    let successCount = 0;
    let failCount = 0;
    const savedReviews: ReviewDto[] = [];

    this.logger.log(`📊 총 ${rows.length}개의 리뷰를 파싱했습니다.`);

    for (const row of rows) {
      const reviewText = row.text || row.review;
      if (!reviewText || reviewText.length === 0) continue;

      try {
        const entity = await this.reviewService.createReview({
          text: reviewText,
          restaurant_id: restaurantId,
          source: ReviewSource.CRAWL,
        });
        savedReviews.push(new ReviewDto(entity)); // ✅ DTO로 변환
        successCount++;
      } catch (err: any) {
        this.logger.warn(
          `❌ 리뷰 저장 실패: "${reviewText}"\n에러: ${err?.message ?? err}`,
        );
        failCount++;
      }
    }

    return {
      message: "CSV 업로드 및 저장 완료",
      total: rows.length,
      success: successCount,
      failed: failCount,
      savedReviews,
    };
  }
}

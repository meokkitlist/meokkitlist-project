// src/dto/create-review.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsNumberString } from "class-validator";

export enum ReviewSource {
  USER = "user",
  CRAWL = "crawl",
}

export class CreateReviewDto {
  @ApiProperty({ description: "리뷰 텍스트", example: "맛있고 친절합니다." })
  @IsString()
  text!: string;

  @ApiPropertyOptional({
    description: "가게 ID (없을 수도 있음, string 또는 number 허용)",
    example: "123",
  })
  @IsOptional()
  // 문자열/숫자 둘 다 허용 (예: "12" 또는 12)
  restaurant_id?: string | number;

  @ApiPropertyOptional({ description: "작성자 사용자 ID", example: "u_42" })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    enum: ReviewSource,
    description: "리뷰 소스 (user | crawl)",
    example: ReviewSource.CRAWL,
  })
  @IsEnum(ReviewSource)
  source!: ReviewSource;
}

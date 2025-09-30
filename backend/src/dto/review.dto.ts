// src/dto/review.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { Review } from "../entities/review.entity";
import { mapEmotion } from "../utils/emotion-mapper";

export class ReviewDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  text: string;

  @ApiProperty()
  restaurant_id: number | null;

  @ApiProperty()
  user_id: string | null;

  @ApiProperty()
  source: string;

  @ApiProperty()
  sentiment: string | null;

  @ApiProperty()
  score: number | null;

  @ApiProperty()
  emoji: string | null;

  @ApiProperty()
  percent: number | null;

  constructor(entity: Review) {
    this.id = entity.id;
    this.text = entity.text;
    this.restaurant_id = entity.restaurant_id;
    this.user_id = entity.user_id;
    this.source = entity.source;
    this.sentiment = entity.sentiment;
    this.score = entity.score;
    this.percent = entity.percent;

    // ✅ DB 값 무시하고 mapEmotion으로 덮어쓰기
    this.emoji = mapEmotion(entity.score ?? 0, entity.sentiment);
  }
}

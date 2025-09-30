// src/dto/review.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { mapEmotion } from '../utils/emotion-mapper';
import { Review } from '../entities/review.entity';

export class ReviewDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ example: '기쁨(행복한)' })
  sentiment: string | null;

  @ApiProperty({ example: 0.75 })
  score: number | null;

  @ApiProperty({ example: '😊' })
  emoji: string;

  @ApiProperty({ example: 58 })
  percent: number | null;

  constructor(entity: Review) {
    this.id = entity.id;
    this.text = entity.text;
    this.sentiment = entity.sentiment;
    this.score = entity.score;
    this.percent = entity.percent;

    // ✅ DB의 emoji 컬럼 무시, 항상 새 매핑
    this.emoji = mapEmotion(
      entity.score ? Number(entity.score) : 0,
      entity.sentiment,
    );
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { mapEmotion } from '../utils/emotion-mapper';

export class ReviewDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  text: string;

  @ApiProperty()
  sentiment: string | null;

  @ApiProperty()
  score: number | null;

  @ApiProperty({ example: '😊' })
  emoji: string;

  constructor(entity: any) {
    this.id = entity.id;
    this.text = entity.text;
    this.sentiment = entity.sentiment ?? null;
    this.score = entity.score ?? null;

    // ✅ 이모지 매핑
    this.emoji = mapEmotion(
      entity.score ? Number(entity.score) : 0,
      entity.sentiment
    );
  }
}

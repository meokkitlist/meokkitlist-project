import { Controller, Post, Body } from '@nestjs/common';
import { SentimentService } from '../services/sentiment.service';

@Controller('sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Post('test')
  async testAnalyze(@Body() body: any) {
    const { text, restaurant_id, source, user_id } = body;

    return this.sentimentService.analyze(
      text,
      restaurant_id,
      source,
      user_id,
    );
  }
}

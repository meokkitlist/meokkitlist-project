import { Controller, Post, Body } from '@nestjs/common';
import { SentimentService } from '../services/sentiment.service';
import { SentimentTestDto } from '../dto/sentiment-test.dto';

@Controller('sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Post('test')
  async testAnalyze(@Body() body: SentimentTestDto) {
    const { text, restaurant_id, source, user_id } = body;

    return this.sentimentService.analyze(text, restaurant_id, source, user_id);
  }
}

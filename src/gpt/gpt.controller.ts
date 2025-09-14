// src/gpt/gpt.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { GptService } from './gpt.service';
import { ExtractKeywordsDto } from './dto/extract-keywords.dto';

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('extract')
  async extractKeywords(@Body() dto: ExtractKeywordsDto) {
    const keywords = await this.gptService.extractKeywords(dto.sentence);
    return {
      input: dto.sentence,
      keywords,
    };
  }
}

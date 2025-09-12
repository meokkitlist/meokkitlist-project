// src/controllers/keyword.controller.ts

import { Controller, Get, Query } from '@nestjs/common';
import { KeywordMapService } from '../services/keyword-map.service';
import { GptService } from '../gpt/gpt.service';

@Controller('v1/keywords')
export class KeywordController {
  constructor(
    private readonly keywordMapService: KeywordMapService,
    private readonly gptService: GptService,
  ) {}

  /**
   * ✅ GET /v1/keywords?q=삼겹
   * 자동완성 키워드 추천
   */
  @Get()
  async getKeywordSuggestions(@Query('q') query?: string): Promise<string[]> {
    if (!query || query.trim() === '') return [];

    const q = query.trim().toLowerCase();

    // 1. Map 기반 자동완성
    const map = this.keywordMapService.getMap();
    const keywordCandidates = Array.from(map.keys())
      .filter((k) => k.toLowerCase().startsWith(q))
      .slice(0, 10);

    if (keywordCandidates.length > 0) {
      return keywordCandidates;
    }

    // 2. GPT fallback
    const gptResult = await this.gptService.extractKeywords(q);

    // GPT 결과 중 map에 있는 키워드만 필터
    const valid = gptResult.filter((k) => map.has(k)).slice(0, 10);

    return valid;
  }
}

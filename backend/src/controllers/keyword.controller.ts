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
   * 자동완성 + GPT 확장 키워드 추천
   */
  @Get()
  async getKeywordSuggestions(@Query('q') query?: string): Promise<string[]> {
    if (!query || query.trim() === '') return [];

    // 🔥 한글/URL 인코딩 대비
    const decoded = decodeURIComponent(query).trim().toLowerCase();

    // 1. Map 기반 자동완성 (DB에 있는 키워드 우선)
    const map = this.keywordMapService.getMap();
    const keywordCandidates = Array.from(map.keys())
      .filter((k) => k.toLowerCase().startsWith(decoded))
      .slice(0, 10);

    // 2. GPT 확장 결과 (DB 여부와 상관없이 사용)
    const gptResult = await this.gptService.extractKeywords(decoded);

    // 3. 합치기 + 중복 제거
    //    - DB 결과 먼저, GPT 결과도 포함
    const merged = Array.from(new Set([...keywordCandidates, ...gptResult]));

    // 4. 최대 10개까지만 반환
    return merged.slice(0, 10);
  }
}

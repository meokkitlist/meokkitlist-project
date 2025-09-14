// src/controllers/search.controller.ts

import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { SearchKeywordDto } from '../dto/search-keyword.dto';

type FlexibleBody = {
  keyword?: string;
  keywords?: string[];
  userPosition?: { lat: number; lon: number };
  range?: number;
};

@Controller('v1/search/places')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * ✅ POST /v1/search/places/keyword
   * GPT 기반 자연어 → 추천
   */
  @Post('keyword')
  async searchByKeyword(@Body() body: FlexibleBody) {
    const keywordFromArray = Array.isArray(body.keywords)
      ? body.keywords.filter(Boolean).join(', ')
      : '';

    const keyword = (body.keyword ?? keywordFromArray ?? '').trim();
    const userPosition = body.userPosition;
    const range = body.range;

    if (!keyword && (!body.keywords || body.keywords.length === 0)) {
      throw new BadRequestException(
        'keyword(문장) 또는 keywords(배열) 중 하나는 반드시 포함되어야 합니다.',
      );
    }

    const dto: SearchKeywordDto & { keywords?: string[] } = {
      keyword,
      keywords: body.keywords,
      userPosition,
      range,
    };

    return this.searchService.searchByKeyword(dto);
  }

  /**
   * ✅ GET /v1/search/places?keywords=삼겹살,신선&lat=35.1&lon=129.0&range=5
   * 빠른 키워드 기반 추천 (GPT 사용 안 함)
   */
  @Get()
  async getPlacesByKeywords(
    @Query('keywords') keywordsRaw?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('range') range?: string,
  ) {
    const keywords: string[] = keywordsRaw
      ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    const userPosition =
      lat && lon
        ? {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
          }
        : undefined;

    const dto: SearchKeywordDto & { keywords?: string[] } = {
      keyword: '', // GPT는 사용하지 않음
      keywords,
      userPosition,
      range: range ? parseFloat(range) : undefined,
    };

    return this.searchService.searchByKeyword(dto);
  }
}

import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchKeywordDto } from '../dto/search-keyword.dto';

type FlexibleBody = {
  keyword?: string;
  keywords?: string[];
  userPosition?: { lat: number; lon: number };
  range?: number;
};

@ApiTags('Search')
@Controller('v1/search/places')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * ✅ POST /v1/search/places/keyword
   * GPT 기반 자연어 → 추천
   */
  @Post('keyword')
  @ApiOperation({
    summary: '키워드 기반 검색 (GPT)',
    description:
      '자연어 문장 또는 키워드 배열을 입력하면 관련된 맛집을 반환합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          example: '부산대 근처 카페',
          description: '자연어 형태의 검색어',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['카페', '분위기 좋은'],
          description: '키워드 배열 (keyword 대신 사용 가능)',
        },
        userPosition: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 35.23 },
            lon: { type: 'number', example: 129.08 },
          },
          description: '사용자 위치 좌표',
        },
        range: {
          type: 'number',
          example: 3,
          description: '검색 반경 (km)',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: '빠른 키워드 검색',
    description: '간단한 키워드, 좌표, 반경을 이용해 빠른 추천 결과 반환',
  })
  async getPlacesByKeywords(
    @Query('keywords') keywordsRaw?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('range') range?: string,
  ) {
    const keywords: string[] = keywordsRaw
      ? keywordsRaw
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
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

// src/controllers/search.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from "@nestjs/common";
import { SearchService } from "../services/search.service";
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PositionDto, SearchKeywordDto } from "../dto/search-keyword.dto";

type FlexibleBody = {
  keyword?: string;
  keywords?: string[];
  userPosition?: { lat: number; lon: number };
  range?: number;
};

@ApiTags("Search")
@Controller("v1/search/places")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * ✅ POST /v1/search/places/keyword
   * GPT 기반 자연어 → 추천
   */
  @ApiOperation({
    summary: "키워드(문장/배열) 기반 GPT 추천",
    description:
      "키워드 또는 키워드 배열, 위치 정보, 범위를 입력받아 GPT 기반 추천 결과를 반환합니다.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        keyword: { type: "string", example: "신선한 삼겹살집 추천해줘" },
        keywords: {
          type: "array",
          items: { type: "string" },
          example: ["삼겹살", "신선"],
        },
        userPosition: {
          type: "object",
          properties: {
            lat: { type: "number", example: 35.2321 },
            lon: { type: "number", example: 129.081232 },
          },
        },
        range: { type: "number", example: 50 },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: "추천 결과",
    schema: {
      example: {
        meta: {
          query: {
            keyword: "신선한 삼겹살집 추천해줘",
            extractedKeywords: ["삼겹살", "신선"],
            userPosition: { lat: 37.5665, lon: 126.978 },
            range: 50,
          },
          resultCount: 2,
        },
        data: [
          {
            rank: 1,
            restaurant_id: 123,
            marketName: "신선삼겹살",
            marketAddress: "서울시 강남구 ...",
            marketUrl: "https://map.kakao.com/link/to/신선삼겹살,37.5665,126.9780",
            relatedKeyword: ["삼겹살", "신선"],
            keywordsMatched: ["삼겹살"],
            matchScore: 1,
            totalScore: 4.5,
            reviewCount: 120,
            sentimentScore: 0.9,
            finalScore: 7.2,
            naverScore: 4.3,
            coordinates: { lat: 37.5665, lon: 126.978 },
            distanceKm: 50,
          },
          // ...more
        ],
      },
    },
  })
  @Post("keyword")
  async searchByKeyword(@Body() body: FlexibleBody) {
    const keywordFromArray = Array.isArray(body.keywords)
      ? body.keywords.filter(Boolean).join(", ")
      : "";

    const keyword = (body.keyword ?? keywordFromArray ?? "").trim();
    const userPosition = body.userPosition;
    const range = body.range;

    if (!keyword && (!body.keywords || body.keywords.length === 0)) {
      throw new BadRequestException(
        "keyword(문장) 또는 keywords(배열) 중 하나는 반드시 포함되어야 합니다.",
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
  @ApiOperation({
    summary: "키워드(배열) 기반 빠른 추천",
    description: "키워드, 위치, 범위를 쿼리로 입력받아 빠른 추천 결과를 반환합니다.",
  })
  @ApiQuery({
    name: "keywords",
    required: false,
    type: String,
    description: "추천 키워드(콤마로 구분)",
  })
  @ApiQuery({
    name: "lat",
    required: false,
    type: String,
    description: "사용자 위도",
  })
  @ApiQuery({
    name: "lon",
    required: false,
    type: String,
    description: "사용자 경도",
  })
  @ApiQuery({
    name: "range",
    required: false,
    type: String,
    description: "검색 범위(km)",
  })
  @ApiResponse({
    status: 200,
    description: "추천 결과",
    schema: {
      example: {
        meta: {
          query: {
            keyword: "",
            extractedKeywords: ["삼겹살", "신선"],
            userPosition: { lat: 35.1, lon: 129.0 },
            range: 5,
          },
          resultCount: 2,
        },
        data: [
          {
            rank: 1,
            restaurant_id: 456,
            marketName: "부산삼겹살",
            marketAddress: "부산시 ...",
            marketUrl: "https://map.kakao.com/link/to/부산삼겹살,35.1,129.0",
            relatedKeyword: ["삼겹살", "신선"],
            keywordsMatched: ["삼겹살"],
            matchScore: 1,
            totalScore: 4.2,
            reviewCount: 80,
            sentimentScore: 0.8,
            finalScore: 6.5,
            naverScore: 4.0,
            coordinates: { lat: 35.1, lon: 129.0 },
            distanceKm: 2.5,
          },
          // ...more
        ],
      },
    },
  })
  @Get()
  async getPlacesByKeywords(
    @Query("keywords") keywordsRaw?: string,
    @Query("lat") lat?: string,
    @Query("lon") lon?: string,
    @Query("range") range?: string,
  ) {
    const keywords: string[] = keywordsRaw
      ? keywordsRaw
          .split(",")
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
      keyword: "", // GPT는 사용하지 않음
      keywords,
      userPosition,
      range: range ? parseFloat(range) : undefined,
    };

    return this.searchService.searchByKeyword(dto);
  }
}
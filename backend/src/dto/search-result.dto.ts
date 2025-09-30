// src/dto/search-result.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty({ example: 1 })
  restaurant_id: number;

  @ApiProperty({ example: '코하루' })
  marketName: string;

  @ApiProperty({ example: '부산 금정구 부산대학로38번길 16', nullable: true })
  marketAddress: string | null;

  @ApiProperty({ example: '맛있는 돈코츠라멘집', nullable: true })
  preview?: string | null;

  @ApiProperty({ example: 3024 })
  reviewCount: number;

  @ApiProperty({ example: 47 })
  sentimentScore: number;

  @ApiProperty({ example: 85.3, description: '최종 랭킹 점수' })
  finalScore: number;

  @ApiProperty({
    example: 'https://map.kakao.com/link/to/코하루,35.2321,129.081232',
    nullable: true,
  })
  marketUrl?: string | null;

  @ApiProperty({ example: ['삼겹살', '고기', '맛집'], nullable: true })
  relatedKeyword?: string[] | null;

  @ApiProperty({ example: ['삼겹살'], nullable: true })
  keywordsMatched?: string[] | null;

  @ApiProperty({ example: 4.2, nullable: true })
  naverScore?: number | null;

  @ApiProperty({
    example: { lat: 35.2321, lon: 129.081232 },
    nullable: true,
  })
  coordinates?: { lat: number | null; lon: number | null };

  @ApiProperty({ example: 0.5, nullable: true })
  distanceKm?: number | null;

  @ApiProperty({ example: 1 })
  rank: number;

  constructor(entity: any) {
  this.restaurant_id = entity.id;
  this.marketName = entity.name;
  this.marketAddress = entity.address;
  this.preview = entity.preview ?? null;
  this.reviewCount = entity.reviewCount;
  this.sentimentScore = entity.sentimentScore;
  this.finalScore = entity.finalScore;

  // 좌표 있을 때 목적지 URL 생성
  if (entity.lat && entity.lon) {
    this.marketUrl = `https://map.kakao.com/link/to/${encodeURIComponent(entity.name)},${entity.lat},${entity.lon}`;
  } else {
    // 좌표 없으면 검색 URL이라도 연결
    this.marketUrl = `https://map.kakao.com/link/search/${encodeURIComponent(entity.name)}`;
  }

  this.relatedKeyword = entity.relatedKeyword ?? null;
  this.keywordsMatched = entity.keywordsMatched ?? null;
  this.naverScore = entity.naverScore ?? null;

  // 좌표 매핑
  this.coordinates = {
    lat: entity.lat ? Number(entity.lat) : null,
    lon: entity.lon ? Number(entity.lon) : null,
  };

  this.distanceKm = entity.distanceKm ?? null;
  this.rank = entity.rank;
}
}

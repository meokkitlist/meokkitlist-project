// src/dto/search-result.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '코하루' })
  name: string;

  @ApiProperty({ example: '부산 금정구 부산대학로38번길 16', nullable: true })
  address: string | null;   // ✅ 수정 (nullable 허용)

  @ApiProperty({ example: '맛있는 돈코츠라멘집', nullable: true })
  preview?: string | null;  // ✅ 수정 (nullable 허용)

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
}

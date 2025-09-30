// src/dto/search-keyword.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsDefined,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PositionDto {
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 35.2321, description: '위도' })
  lat: number;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 129.081232, description: '경도' })
  lon: number;
}

export class SearchKeywordDto {
  @IsDefined()
  @IsString()
  @ApiProperty({ example: '신선한 삼겹살집 추천해줘', description: '검색 키워드(문장)' })
  keyword: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  @ApiPropertyOptional({ type: PositionDto, description: '사용자 위치 정보' })
  userPosition?: PositionDto;

  /**
   * 검색 범위 (킬로미터 단위)
   * - 기본값: 5km
   * - 허용 범위: 0.3km ~ 10km
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.3)
  @Max(10)
  @ApiPropertyOptional({ example: 5, description: '검색 범위(km)' })
  range?: number;
}

// src/dto/search-keyword.query.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchKeywordQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '삼겹살,신선', description: '추천 키워드(콤마로 구분)' })
  keywords?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '35.2321', description: '사용자 위도' })
  lat?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '129.081232', description: '사용자 경도' })
  lon?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '500', description: '검색 범위(km)' })
  range?: string;
}
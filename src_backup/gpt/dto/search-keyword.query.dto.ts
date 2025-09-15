// src/dto/search-keyword.query.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchKeywordQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lon?: string;

  @IsOptional()
  @IsString()
  range?: string;
}

// src/dto/search-keyword.dto.ts

import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PositionDto {
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  lon: number;
}

export class SearchKeywordDto {
  @IsDefined()
  @IsString()
  keyword: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  userPosition?: PositionDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  range?: number;
}

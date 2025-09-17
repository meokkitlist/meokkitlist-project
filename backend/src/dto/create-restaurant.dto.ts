import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsNumber()
  lat: number | null;

  @IsOptional()
  @IsNumber()
  lon: number | null;

  @IsOptional()
  @IsString()
  preview?: string | null;

  @IsOptional()
  @IsNumber()
  review_count?: number;

  @IsOptional()
  @IsNumber()
  total_score?: number;

  @IsOptional()
  @IsNumber()
  naver_score?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // 배열 안 요소가 문자열임을 보장
  keywords?: string[] | null;

  @IsOptional()
  @IsString()
  url?: string | null;

  @IsOptional()
  @IsString()
  review?: string | null;
}

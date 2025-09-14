// src/dto/create-restaurant.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

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
  review_count?: number;

  @IsOptional()
  total_score?: number;

  @IsOptional()
  naver_score?: number;

  @IsOptional()
  keywords?: string[] | null;
}

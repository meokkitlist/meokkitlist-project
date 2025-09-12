import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchKakaoDto {
  @IsString()
  query: string;

  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @Type(() => Number)
  @IsNumber()
  radius: number;
}

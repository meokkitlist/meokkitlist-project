import { IsString, IsOptional, IsIn } from 'class-validator';

export class SentimentTestDto {
  @IsString()
  text: string;

  @IsString()
  restaurant_id: string;

  @IsString()
  @IsIn(['user', 'crawl'])
  source: 'user' | 'crawl';

  @IsOptional()
  @IsString()
  user_id?: string;
}

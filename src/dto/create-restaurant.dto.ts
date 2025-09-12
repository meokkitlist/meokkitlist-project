export class CreateRestaurantDto {
  name: string;
  address: string;
  lat: number;
  lon: number;
  keywords?: string[]; // CSV에 없으면 기본 null
  review_count?: number;
  total_score?: number;
  naver_score?: number;
  preview?: string;
}

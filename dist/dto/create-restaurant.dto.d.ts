export declare class CreateRestaurantDto {
    name: string;
    address: string;
    lat: number | null;
    lon: number | null;
    preview?: string | null;
    review_count?: number;
    total_score?: number;
    naver_score?: number;
    keywords?: string[] | null;
}

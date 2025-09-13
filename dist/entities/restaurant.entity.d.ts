import { Review } from './review.entity';
export declare class Restaurant {
    id: number;
    name: string;
    address: string;
    lat: number | null;
    lon: number | null;
    keywords: string[] | null;
    review_count: number;
    total_score: number;
    naver_score: number;
    preview: string | null;
    reviews: Review[];
}

import { Restaurant } from './restaurant.entity';
export declare class Review {
    id: number;
    text: string;
    restaurant_id: number;
    restaurant: Restaurant;
    user_id: string | null;
    source: 'user' | 'crawl';
    sentiment: string | null;
    score: number | null;
    emoji: string | null;
    percent: number | null;
    raw: any;
}

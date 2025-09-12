import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
export declare class KeywordMapService {
    private readonly restaurantRepo;
    private readonly logger;
    private keywordToRestaurantMap;
    constructor(restaurantRepo: Repository<Restaurant>);
    buildKeywordMap(): Promise<void>;
    getRestaurantIdsByKeyword(keyword: string): number[];
    getMap(): Map<string, number[]>;
    private safeParseKeywords;
}

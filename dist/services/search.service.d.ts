import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { SearchKeywordDto } from '../dto/search-keyword.dto';
import { GptService } from '../gpt/gpt.service';
import { KeywordMapService } from './keyword-map.service';
export declare class SearchService implements OnModuleInit {
    private readonly restaurantRepo;
    private readonly gptService;
    private readonly keywordMapService;
    private readonly logger;
    constructor(restaurantRepo: Repository<Restaurant>, gptService: GptService, keywordMapService: KeywordMapService);
    onModuleInit(): Promise<void>;
    getRestaurantIdsByKeyword(keyword: string): number[];
    getFullKeywordMap(): Record<string, number[]>;
    private haversine;
    private safeParseKeywords;
    private calcMatchScore;
    private calcFinalScore;
    searchByKeyword(dto: SearchKeywordDto & {
        keywords?: string[];
    }): Promise<{
        meta: {
            query: {
                keyword: string;
                userPosition: import("../dto/search-keyword.dto").PositionDto | undefined;
                range: number | undefined;
                extractedKeywords?: undefined;
            };
            resultCount: number;
        };
        data: never[];
        message: string;
    } | {
        meta: {
            query: {
                keyword: string;
                extractedKeywords: string[];
                userPosition: import("../dto/search-keyword.dto").PositionDto | undefined;
                range: number | undefined;
            };
            resultCount: number;
        };
        data: {
            rank: number;
            marketName: any;
            marketAddress: any;
            marketUrl: string | null;
            relatedKeyword: string[];
            keywordsMatched: string[];
            matchScore: number;
            totalScore: any;
            reviewCount: any;
            sentimentScore: any;
            finalScore: number;
            naverScore: any;
            coordinates: {
                lat: any;
                lon: any;
            };
            distanceKm: number | null;
        }[];
        message?: undefined;
    }>;
}

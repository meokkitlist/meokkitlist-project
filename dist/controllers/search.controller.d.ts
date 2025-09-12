import { SearchService } from '../services/search.service';
type FlexibleBody = {
    keyword?: string;
    keywords?: string[];
    userPosition?: {
        lat: number;
        lon: number;
    };
    range?: number;
};
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    searchByKeyword(body: FlexibleBody): Promise<{
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
    getPlacesByKeywords(keywordsRaw?: string, lat?: string, lon?: string, range?: string): Promise<{
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
export {};

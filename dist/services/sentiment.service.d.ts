import { HttpService } from '@nestjs/axios';
export interface SentimentResult {
    sentiment: string;
    score: number;
    emoji: string;
    percent: number;
    raw: {
        top_label: string;
        top_prob: number;
        keywords?: string[];
        ui?: {
            emoji: string;
            percent: number;
        };
    };
}
export declare class SentimentService {
    private readonly httpService;
    constructor(httpService: HttpService);
    analyze(text: string, restaurantId: string, source: 'user' | 'crawl', userId?: string): Promise<SentimentResult>;
    expandKeywords(keyword: string): Promise<string[]>;
}

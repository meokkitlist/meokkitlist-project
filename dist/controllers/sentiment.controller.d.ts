import { SentimentService } from '../services/sentiment.service';
export declare class SentimentController {
    private readonly sentimentService;
    constructor(sentimentService: SentimentService);
    testAnalyze(body: any): Promise<import("../services/sentiment.service").SentimentResult>;
}

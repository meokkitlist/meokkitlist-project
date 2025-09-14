import { Cache } from 'cache-manager';
export declare class GptService {
    private readonly cacheManager;
    private readonly logger;
    private readonly openai;
    private readonly MODEL;
    private readonly MAX_RETURN;
    private readonly CACHE_TTL_SEC;
    constructor(cacheManager: Cache);
    extractKeywords(sentence: string): Promise<string[]>;
    private parseKeywordsFromResponse;
    private simpleFallbackExtract;
    private normalizeKeywordList;
}

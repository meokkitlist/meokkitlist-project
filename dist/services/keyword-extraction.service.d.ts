import { KeywordMapService } from './keyword-map.service';
export declare class KeywordExtractionService {
    private readonly keywordMapService;
    private readonly logger;
    constructor(keywordMapService: KeywordMapService);
    runExtractorScript(restaurantId?: number): Promise<void>;
}

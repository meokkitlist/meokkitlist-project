import { KeywordMapService } from '../services/keyword-map.service';
import { GptService } from '../gpt/gpt.service';
export declare class KeywordController {
    private readonly keywordMapService;
    private readonly gptService;
    constructor(keywordMapService: KeywordMapService, gptService: GptService);
    getKeywordSuggestions(query?: string): Promise<string[]>;
}

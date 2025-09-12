import { GptService } from './gpt.service';
import { ExtractKeywordsDto } from './dto/extract-keywords.dto';
export declare class GptController {
    private readonly gptService;
    constructor(gptService: GptService);
    extractKeywords(dto: ExtractKeywordsDto): Promise<{
        input: string;
        keywords: string[];
    }>;
}

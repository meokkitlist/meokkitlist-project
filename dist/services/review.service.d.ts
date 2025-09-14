import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { SentimentService } from './sentiment.service';
import { KeywordExtractionService } from './keyword-extraction.service';
interface CreateReviewDto {
    text: string;
    restaurant_id: string;
    user_id?: string;
    source: 'user' | 'crawl';
}
export declare class ReviewService {
    private readonly sentimentService;
    private readonly keywordExtractionService;
    private readonly reviewRepo;
    private readonly logger;
    constructor(sentimentService: SentimentService, keywordExtractionService: KeywordExtractionService, reviewRepo: Repository<Review>);
    createReview(dto: CreateReviewDto): Promise<{
        message: string;
        data: Review;
    }>;
}
export {};

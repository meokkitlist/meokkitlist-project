import { ReviewService } from "../services/review.service";
import { SentimentService } from "../services/sentiment.service";
export declare enum ReviewSource {
    USER = "user",
    CRAWL = "crawl"
}
export declare class CreateReviewDto {
    text: string;
    restaurant_id: string;
    user_id?: string;
    source: ReviewSource;
}
export declare class ExpandKeywordDto {
    keyword: string;
}
export declare class ReviewController {
    private readonly reviewService;
    private readonly sentimentService;
    constructor(reviewService: ReviewService, sentimentService: SentimentService);
    createReview(body: CreateReviewDto): Promise<{
        message: string;
        data: import("../entities/review.entity").Review;
    }>;
    expandKeyword(body: ExpandKeywordDto): Promise<{
        keywords: string[];
    }>;
    uploadCsv(file: Express.Multer.File): Promise<{
        message: string;
        total: number;
        success: number;
        failed: number;
    }>;
}

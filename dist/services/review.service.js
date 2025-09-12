"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const review_entity_1 = require("../entities/review.entity");
const sentiment_service_1 = require("./sentiment.service");
const keyword_extraction_service_1 = require("./keyword-extraction.service");
let ReviewService = ReviewService_1 = class ReviewService {
    sentimentService;
    keywordExtractionService;
    reviewRepo;
    logger = new common_1.Logger(ReviewService_1.name);
    constructor(sentimentService, keywordExtractionService, reviewRepo) {
        this.sentimentService = sentimentService;
        this.keywordExtractionService = keywordExtractionService;
        this.reviewRepo = reviewRepo;
    }
    async createReview(dto) {
        const { text, restaurant_id, user_id, source } = dto;
        const restaurantId = Number(restaurant_id);
        let sentimentResult;
        try {
            sentimentResult = await this.sentimentService.analyze(text, String(restaurantId), source, user_id);
        }
        catch (error) {
            this.logger.error('❌ 감성 분석 중 오류:', error);
            throw new Error('리뷰 감성 분석에 실패했습니다.');
        }
        const review = this.reviewRepo.create({
            text,
            restaurant_id: restaurantId,
            user_id,
            source,
            sentiment: sentimentResult.sentiment,
            score: sentimentResult.score,
            emoji: sentimentResult.emoji,
            percent: sentimentResult.percent,
            raw: sentimentResult.raw,
        });
        const savedReview = await this.reviewRepo.save(review);
        try {
            await this.keywordExtractionService.runExtractorScript(restaurantId);
            this.logger.log(`✅ 키워드 추출 및 Map 최신화 완료 (restaurant_id=${restaurantId})`);
        }
        catch (err) {
            this.logger.warn(`⚠️ 키워드 추출 실패 (restaurant_id=${restaurantId})`, err);
        }
        return {
            message: '리뷰 분석 및 저장 완료',
            data: savedReview,
        };
    }
};
exports.ReviewService = ReviewService;
exports.ReviewService = ReviewService = ReviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __metadata("design:paramtypes", [sentiment_service_1.SentimentService,
        keyword_extraction_service_1.KeywordExtractionService,
        typeorm_2.Repository])
], ReviewService);
//# sourceMappingURL=review.service.js.map
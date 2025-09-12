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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const review_service_1 = require("../services/review.service");
const sentiment_service_1 = require("../services/sentiment.service");
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
let ReviewController = class ReviewController {
    reviewService;
    sentimentService;
    constructor(reviewService, sentimentService) {
        this.reviewService = reviewService;
        this.sentimentService = sentimentService;
    }
    async createReview(body) {
        return this.reviewService.createReview(body);
    }
    async expandKeyword(body) {
        const keywords = await this.sentimentService.expandKeywords(body.keyword);
        return { keywords };
    }
    async uploadCsv(file) {
        if (!file) {
            return { message: 'CSV 파일이 업로드되지 않았습니다.' };
        }
        const results = [];
        const stream = stream_1.Readable.from(file.buffer);
        return new Promise((resolve, reject) => {
            stream
                .pipe((0, csv_parser_1.default)())
                .on('data', (row) => {
                if (row.review) {
                    row.review = row.review.trim();
                }
                if (row.review && row.review.length > 0) {
                    results.push(row);
                }
            })
                .on('end', async () => {
                let successCount = 0;
                let failCount = 0;
                for (const row of results) {
                    try {
                        await this.reviewService.createReview({
                            text: row.review,
                            restaurant_id: row.restaurant_id ?? '0',
                            user_id: undefined,
                            source: 'crawl',
                        });
                        successCount++;
                    }
                    catch (err) {
                        failCount++;
                    }
                }
                resolve({
                    message: 'CSV 업로드 및 저장 완료',
                    total: results.length,
                    success: successCount,
                    failed: failCount,
                });
            })
                .on('error', (err) => {
                reject({ message: 'CSV 파싱 오류', error: err.message });
            });
        });
    }
};
exports.ReviewController = ReviewController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "createReview", null);
__decorate([
    (0, common_1.Post)('expand-keyword'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "expandKeyword", null);
__decorate([
    (0, common_1.Post)('upload-csv'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "uploadCsv", null);
exports.ReviewController = ReviewController = __decorate([
    (0, common_1.Controller)('review'),
    __metadata("design:paramtypes", [review_service_1.ReviewService,
        sentiment_service_1.SentimentService])
], ReviewController);
//# sourceMappingURL=review.controller.js.map
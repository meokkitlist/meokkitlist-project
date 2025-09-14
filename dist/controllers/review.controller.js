"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ReviewController = exports.ExpandKeywordDto = exports.CreateReviewDto = exports.ReviewSource = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const multer_1 = require("multer");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const review_service_1 = require("../services/review.service");
const sentiment_service_1 = require("../services/sentiment.service");
var ReviewSource;
(function (ReviewSource) {
    ReviewSource["USER"] = "user";
    ReviewSource["CRAWL"] = "crawl";
})(ReviewSource || (exports.ReviewSource = ReviewSource = {}));
class CreateReviewDto {
    text;
    restaurant_id;
    user_id;
    source;
}
exports.CreateReviewDto = CreateReviewDto;
__decorate([
    (0, swagger_2.ApiProperty)({ description: "리뷰 텍스트", example: "맛있고 친절합니다." }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "text", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: "가게 ID", example: "123" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "restaurant_id", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: "작성자 사용자 ID", example: "u_42" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({
        enum: ReviewSource,
        description: "리뷰 소스",
        example: ReviewSource.CRAWL,
    }),
    (0, class_validator_1.IsEnum)(ReviewSource),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "source", void 0);
class ExpandKeywordDto {
    keyword;
}
exports.ExpandKeywordDto = ExpandKeywordDto;
__decorate([
    (0, swagger_2.ApiProperty)({ description: "기준 키워드", example: "분위기" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExpandKeywordDto.prototype, "keyword", void 0);
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "csv");
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
let ReviewController = class ReviewController {
    reviewService;
    sentimentService;
    constructor(reviewService, sentimentService) {
        this.reviewService = reviewService;
        this.sentimentService = sentimentService;
        ensureDir(UPLOAD_DIR);
    }
    async createReview(body) {
        return this.reviewService.createReview(body);
    }
    async expandKeyword(body) {
        const keywords = await this.sentimentService.expandKeywords(body.keyword);
        return { keywords };
    }
    async uploadCsv(file) {
        if (!file?.path) {
            throw new common_1.BadRequestException("파일 업로드 실패");
        }
        const results = [];
        try {
            await new Promise((resolve, reject) => {
                fs.createReadStream(file.path, { encoding: "utf8" })
                    .pipe((0, csv_parser_1.default)())
                    .on("data", (row) => {
                    if (row.review)
                        row.review = row.review.trim();
                    if (row.review && row.review.length > 0) {
                        results.push(row);
                    }
                })
                    .on("end", () => resolve())
                    .on("error", (err) => reject(err));
            });
            let successCount = 0;
            let failCount = 0;
            for (const row of results) {
                try {
                    await this.reviewService.createReview({
                        text: row.review,
                        restaurant_id: row.restaurant_id ?? "0",
                        user_id: undefined,
                        source: ReviewSource.CRAWL,
                    });
                    successCount++;
                }
                catch {
                    failCount++;
                }
            }
            return {
                message: "CSV 업로드 및 저장 완료",
                total: results.length,
                success: successCount,
                failed: failCount,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`CSV 파싱 오류: ${error?.message ?? error}`);
        }
        finally {
            try {
                await fs.promises.unlink(file.path);
            }
            catch {
            }
        }
    }
};
exports.ReviewController = ReviewController;
__decorate([
    (0, common_1.Post)("create"),
    (0, swagger_1.ApiOperation)({ summary: "단일 리뷰 생성" }),
    (0, swagger_1.ApiCreatedResponse)({ description: "리뷰 생성 성공" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "createReview", null);
__decorate([
    (0, common_1.Post)("expand-keyword"),
    (0, swagger_1.ApiOperation)({ summary: "키워드 확장" }),
    (0, swagger_1.ApiOkResponse)({ description: "확장된 키워드 목록 반환" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExpandKeywordDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "expandKeyword", null);
__decorate([
    (0, common_1.Post)("upload-csv"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                ensureDir(UPLOAD_DIR);
                cb(null, UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const ts = Date.now();
                const ext = path.extname(file.originalname) || ".csv";
                cb(null, `review_${ts}${ext}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const ok = file.mimetype === "text/csv" ||
                file.originalname.toLowerCase().endsWith(".csv");
            cb(ok ? null : new common_1.BadRequestException("CSV 파일만 업로드 가능합니다."), ok);
        },
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    (0, swagger_1.ApiOperation)({ summary: "CSV 업로드(리뷰 배치 저장)" }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiBody)({
        description: "리뷰 CSV 업로드 (컬럼 예: review, restaurant_id)",
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" },
            },
        },
    }),
    (0, swagger_1.ApiOkResponse)({
        description: "CSV 업로드 및 저장 결과",
        schema: {
            type: "object",
            properties: {
                message: { type: "string", example: "CSV 업로드 및 저장 완료" },
                total: { type: "number", example: 100 },
                success: { type: "number", example: 98 },
                failed: { type: "number", example: 2 },
            },
        },
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "uploadCsv", null);
exports.ReviewController = ReviewController = __decorate([
    (0, swagger_1.ApiTags)("Review"),
    (0, common_1.Controller)("review"),
    __metadata("design:paramtypes", [review_service_1.ReviewService,
        sentiment_service_1.SentimentService])
], ReviewController);
//# sourceMappingURL=review.controller.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
let SentimentService = class SentimentService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async analyze(text, restaurantId, source, userId) {
        try {
            const response = await this.httpService.axiosRef.post('http://localhost:8001/analyze', {
                text,
                restaurant_id: restaurantId,
                source,
                user_id: userId,
            }, { headers: { 'Content-Type': 'application/json' } });
            const data = response.data;
            if (!data?.top_label || typeof data.top_prob !== 'number') {
                throw new Error('FastAPI 감성 분석 결과가 올바르지 않습니다.');
            }
            const labelToBaseScore = {
                very_neg: { sentiment: 'Very Negative', base: 10 },
                neg: { sentiment: 'Negative', base: 30 },
                neu: { sentiment: 'Neutral', base: 50 },
                pos: { sentiment: 'Positive', base: 70 },
                very_pos: { sentiment: 'Very Positive', base: 90 },
            };
            const mapped = labelToBaseScore[data.top_label] ?? {
                sentiment: 'Unknown',
                base: 50,
            };
            const adjustedScore = Math.round(mapped.base * data.top_prob);
            const percent = data.ui?.percent ?? Math.round(data.top_prob * 100);
            const emoji = data.ui?.emoji ?? '❓';
            return {
                sentiment: mapped.sentiment,
                score: Math.min(100, Math.max(0, adjustedScore)),
                percent,
                emoji,
                raw: data,
            };
        }
        catch (error) {
            console.error('❌ 감성 분석 실패:', error?.message || error);
            return {
                sentiment: 'error',
                score: 0,
                emoji: '❌',
                percent: 0,
                raw: {
                    top_label: 'error',
                    top_prob: 0,
                },
            };
        }
    }
    async expandKeywords(keyword) {
        try {
            const response = await this.httpService.axiosRef.post('http://localhost:8001/expand_keywords', { keyword }, { headers: { 'Content-Type': 'application/json' } });
            const keywords = response.data?.keywords;
            if (!Array.isArray(keywords)) {
                throw new Error('FastAPI로부터 키워드 배열을 받지 못했습니다.');
            }
            return keywords;
        }
        catch (error) {
            console.error('❌ 키워드 확장 실패:', error?.message || error);
            return [keyword];
        }
    }
};
exports.SentimentService = SentimentService;
exports.SentimentService = SentimentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], SentimentService);
//# sourceMappingURL=sentiment.service.js.map
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
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const restaurant_entity_1 = require("../entities/restaurant.entity");
const gpt_service_1 = require("../gpt/gpt.service");
const keyword_map_service_1 = require("./keyword-map.service");
const ranking_config_1 = require("../config/ranking.config");
let SearchService = SearchService_1 = class SearchService {
    restaurantRepo;
    gptService;
    keywordMapService;
    logger = new common_1.Logger(SearchService_1.name);
    constructor(restaurantRepo, gptService, keywordMapService) {
        this.restaurantRepo = restaurantRepo;
        this.gptService = gptService;
        this.keywordMapService = keywordMapService;
    }
    async onModuleInit() {
        await this.keywordMapService.buildKeywordMap();
    }
    getRestaurantIdsByKeyword(keyword) {
        return this.keywordMapService.getRestaurantIdsByKeyword(keyword);
    }
    getFullKeywordMap() {
        return Object.fromEntries(this.keywordMapService.getMap());
    }
    haversine(a, b) {
        const R = 6371;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    safeParseKeywords(raw) {
        if (!raw)
            return [];
        if (Array.isArray(raw))
            return raw;
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch {
                return raw.split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        return [];
    }
    calcMatchScore(restaurantKeywords, needleKeywords) {
        const rset = new Set(restaurantKeywords.map((k) => k.trim()));
        let score = 0;
        const matched = [];
        for (const kw of needleKeywords) {
            const k = kw.trim();
            const hit = rset.has(k) ||
                Array.from(rset).some((rk) => rk.includes(k) || k.includes(rk));
            if (hit) {
                score += 1;
                matched.push(k);
            }
        }
        return { score, matched };
    }
    calcFinalScore({ matchScore, totalScore, reviewCount, sentimentScore, }) {
        return (matchScore * ranking_config_1.SCORE_WEIGHTS.matchScore +
            totalScore * ranking_config_1.SCORE_WEIGHTS.totalScore +
            reviewCount * ranking_config_1.SCORE_WEIGHTS.reviewCount +
            sentimentScore * ranking_config_1.SCORE_WEIGHTS.sentimentScore);
    }
    async searchByKeyword(dto) {
        const { keyword, userPosition, range } = dto;
        let extractedKeywords = [];
        if (dto.keywords && dto.keywords.length > 0) {
            this.logger.log(`📌 키워드 배열 입력 받음: ${JSON.stringify(dto.keywords)}`);
            const knownKeywords = [];
            const unknownKeywords = [];
            for (const k of dto.keywords) {
                if (this.keywordMapService.getRestaurantIdsByKeyword(k).length > 0) {
                    knownKeywords.push(k);
                }
                else {
                    unknownKeywords.push(k);
                }
            }
            let expandedKeywords = [];
            if (unknownKeywords.length > 0) {
                this.logger.log(`🤖 GPT 호출 필요: ${JSON.stringify(unknownKeywords)}`);
                const gptResults = await this.gptService.extractKeywords(unknownKeywords.join(', '));
                expandedKeywords = gptResults.filter((k) => this.keywordMapService.getRestaurantIdsByKeyword(k).length > 0);
                this.logger.log(`🔁 GPT 유사어 중 사용 가능한 키워드: ${JSON.stringify(expandedKeywords)}`);
            }
            extractedKeywords = [...knownKeywords, ...expandedKeywords];
        }
        else if (keyword) {
            extractedKeywords = await this.gptService.extractKeywords(keyword);
            this.logger.log(`🤖 GPT 문장 기반 키워드 추출: ${JSON.stringify(extractedKeywords)}`);
        }
        if (!extractedKeywords || extractedKeywords.length === 0) {
            return {
                meta: {
                    query: { keyword, userPosition, range },
                    resultCount: 0,
                },
                data: [],
                message: '추천에 사용할 키워드를 찾을 수 없었어요.',
            };
        }
        const restaurantIdSet = new Set();
        for (const kw of extractedKeywords) {
            const ids = this.keywordMapService.getRestaurantIdsByKeyword(kw);
            ids.forEach(id => restaurantIdSet.add(id));
        }
        const idList = [...restaurantIdSet];
        let candidates = [];
        if (idList.length > 0) {
            candidates = await this.restaurantRepo.find({
                where: { id: (0, typeorm_2.In)(idList) },
            });
        }
        if (candidates.length === 0 && keyword) {
            candidates = await this.restaurantRepo
                .createQueryBuilder('r')
                .where('r.keywords LIKE :kw', { kw: `%${keyword}%` })
                .getMany();
        }
        const needles = extractedKeywords;
        let enriched = candidates.map((r) => {
            const rKeywords = this.safeParseKeywords(r.keywords);
            const { score: matchScore, matched } = this.calcMatchScore(rKeywords, needles);
            const totalScore = r.total_score ?? 0;
            const reviewCount = r.review_count ?? 0;
            const sentimentScore = r.sentiment_score ?? 0;
            let distanceKm = null;
            if (userPosition?.lat && userPosition?.lon && r.lat && r.lon) {
                distanceKm = this.haversine({ lat: userPosition.lat, lon: userPosition.lon }, { lat: Number(r.lat), lon: Number(r.lon) });
            }
            const finalScore = this.calcFinalScore({
                matchScore,
                totalScore,
                reviewCount,
                sentimentScore,
            });
            return {
                raw: r,
                matchScore,
                totalScore,
                reviewCount,
                sentimentScore,
                finalScore,
                keywordsMatched: matched,
                distanceKm,
            };
        });
        if (range && userPosition?.lat && userPosition?.lon) {
            enriched = enriched.filter((e) => e.distanceKm !== null && e.distanceKm <= Number(range));
        }
        enriched.sort((a, b) => {
            if (b.finalScore !== a.finalScore)
                return b.finalScore - a.finalScore;
            const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
            const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
            return da - db;
        });
        const TOPN = 10;
        const top = enriched.slice(0, TOPN);
        return {
            meta: {
                query: {
                    keyword,
                    extractedKeywords: needles,
                    userPosition,
                    range,
                },
                resultCount: top.length,
            },
            data: top.map((e, i) => {
                const r = e.raw;
                return {
                    rank: i + 1,
                    marketName: r.name,
                    marketAddress: r.address,
                    marketUrl: r.lat && r.lon
                        ? `https://map.kakao.com/link/to/${encodeURIComponent(r.name)},${r.lat},${r.lon}`
                        : null,
                    relatedKeyword: this.safeParseKeywords(r.keywords),
                    keywordsMatched: e.keywordsMatched,
                    matchScore: e.matchScore,
                    totalScore: e.totalScore,
                    reviewCount: e.reviewCount,
                    sentimentScore: e.sentimentScore,
                    finalScore: e.finalScore,
                    naverScore: r.naver_score ?? null,
                    coordinates: {
                        lat: r.lat ?? null,
                        lon: r.lon ?? null,
                    },
                    distanceKm: e.distanceKm,
                };
            }),
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        gpt_service_1.GptService,
        keyword_map_service_1.KeywordMapService])
], SearchService);
//# sourceMappingURL=search.service.js.map
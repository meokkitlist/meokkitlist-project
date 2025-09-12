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
var KeywordMapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordMapService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const restaurant_entity_1 = require("../entities/restaurant.entity");
let KeywordMapService = KeywordMapService_1 = class KeywordMapService {
    restaurantRepo;
    logger = new common_1.Logger(KeywordMapService_1.name);
    keywordToRestaurantMap = new Map();
    constructor(restaurantRepo) {
        this.restaurantRepo = restaurantRepo;
    }
    async buildKeywordMap() {
        this.logger.log('🔁 키워드 → 가게 Map 재생성 시작');
        const allRestaurants = await this.restaurantRepo.find();
        const newMap = new Map();
        for (const restaurant of allRestaurants) {
            if (!restaurant.keywords || restaurant.keywords.length === 0)
                continue;
            const keywordList = this.safeParseKeywords(restaurant.keywords);
            for (const keyword of keywordList) {
                const trimmed = keyword.trim();
                if (!newMap.has(trimmed)) {
                    newMap.set(trimmed, []);
                }
                if (!newMap.get(trimmed).includes(restaurant.id)) {
                    newMap.get(trimmed).push(restaurant.id);
                }
            }
        }
        this.keywordToRestaurantMap = newMap;
        this.logger.log(`✅ Map 빌드 완료: ${this.keywordToRestaurantMap.size}개 키워드`);
    }
    getRestaurantIdsByKeyword(keyword) {
        return this.keywordToRestaurantMap.get(keyword.trim()) || [];
    }
    getMap() {
        return this.keywordToRestaurantMap;
    }
    safeParseKeywords(raw) {
        if (!raw)
            return [];
        if (Array.isArray(raw)) {
            return raw.map((k) => String(k).trim()).filter(Boolean);
        }
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map((k) => String(k).trim()).filter(Boolean);
                }
            }
            catch {
                return raw.split(',').map((k) => k.trim()).filter(Boolean);
            }
        }
        return [];
    }
};
exports.KeywordMapService = KeywordMapService;
exports.KeywordMapService = KeywordMapService = KeywordMapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], KeywordMapService);
//# sourceMappingURL=keyword-map.service.js.map
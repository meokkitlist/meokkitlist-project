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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("../services/search.service");
let SearchController = class SearchController {
    searchService;
    constructor(searchService) {
        this.searchService = searchService;
    }
    async searchByKeyword(body) {
        const keywordFromArray = Array.isArray(body.keywords)
            ? body.keywords.filter(Boolean).join(', ')
            : '';
        const keyword = (body.keyword ?? keywordFromArray ?? '').trim();
        const userPosition = body.userPosition;
        const range = body.range;
        if (!keyword && (!body.keywords || body.keywords.length === 0)) {
            throw new common_1.BadRequestException('keyword(문장) 또는 keywords(배열) 중 하나는 반드시 포함되어야 합니다.');
        }
        const dto = {
            keyword,
            keywords: body.keywords,
            userPosition,
            range,
        };
        return this.searchService.searchByKeyword(dto);
    }
    async getPlacesByKeywords(keywordsRaw, lat, lon, range) {
        const keywords = keywordsRaw
            ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean)
            : [];
        const userPosition = lat && lon
            ? {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
            }
            : undefined;
        const dto = {
            keyword: '',
            keywords,
            userPosition,
            range: range ? parseFloat(range) : undefined,
        };
        return this.searchService.searchByKeyword(dto);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Post)('keyword'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchByKeyword", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('keywords')),
    __param(1, (0, common_1.Query)('lat')),
    __param(2, (0, common_1.Query)('lon')),
    __param(3, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getPlacesByKeywords", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('v1/search/places'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map
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
exports.KakaoController = void 0;
const common_1 = require("@nestjs/common");
const kakao_service_1 = require("./kakao.service");
const search_dto_1 = require("./dto/search.dto");
let KakaoController = class KakaoController {
    kakaoService;
    constructor(kakaoService) {
        this.kakaoService = kakaoService;
    }
    async searchPlaces(query) {
        const { query: keyword, lat, lng, radius } = query;
        return this.kakaoService.searchPlaces(keyword, lat, lng, radius);
    }
    async analyzeReview(text) {
        return this.kakaoService.analyzeSentiment(text);
    }
};
exports.KakaoController = KakaoController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchKakaoDto]),
    __metadata("design:returntype", Promise)
], KakaoController.prototype, "searchPlaces", null);
__decorate([
    (0, common_1.Post)('/analyze-review'),
    __param(0, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KakaoController.prototype, "analyzeReview", null);
exports.KakaoController = KakaoController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [kakao_service_1.KakaoService])
], KakaoController);
//# sourceMappingURL=kakao.controller.js.map
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
exports.KeywordController = void 0;
const common_1 = require("@nestjs/common");
const keyword_map_service_1 = require("../services/keyword-map.service");
const gpt_service_1 = require("../gpt/gpt.service");
let KeywordController = class KeywordController {
    keywordMapService;
    gptService;
    constructor(keywordMapService, gptService) {
        this.keywordMapService = keywordMapService;
        this.gptService = gptService;
    }
    async getKeywordSuggestions(query) {
        if (!query || query.trim() === '')
            return [];
        const q = query.trim().toLowerCase();
        const map = this.keywordMapService.getMap();
        const keywordCandidates = Array.from(map.keys())
            .filter((k) => k.toLowerCase().startsWith(q))
            .slice(0, 10);
        if (keywordCandidates.length > 0) {
            return keywordCandidates;
        }
        const gptResult = await this.gptService.extractKeywords(q);
        const valid = gptResult.filter((k) => map.has(k)).slice(0, 10);
        return valid;
    }
};
exports.KeywordController = KeywordController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeywordController.prototype, "getKeywordSuggestions", null);
exports.KeywordController = KeywordController = __decorate([
    (0, common_1.Controller)('v1/keywords'),
    __metadata("design:paramtypes", [keyword_map_service_1.KeywordMapService,
        gpt_service_1.GptService])
], KeywordController);
//# sourceMappingURL=keyword.controller.js.map
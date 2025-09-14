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
var KeywordExtractionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordExtractionService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const util_1 = require("util");
const keyword_map_service_1 = require("./keyword-map.service");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let KeywordExtractionService = KeywordExtractionService_1 = class KeywordExtractionService {
    keywordMapService;
    logger = new common_1.Logger(KeywordExtractionService_1.name);
    constructor(keywordMapService) {
        this.keywordMapService = keywordMapService;
    }
    async runExtractorScript(restaurantId) {
        const scriptPath = 'backend/scripts/keyword_extractor.py';
        const cmd = restaurantId
            ? `python ${scriptPath} ${restaurantId}`
            : `python ${scriptPath}`;
        this.logger.log(`🚀 키워드 추출 스크립트 실행: ${cmd}`);
        try {
            const { stdout, stderr } = await execAsync(cmd);
            if (stdout.trim())
                this.logger.debug(`📤 Python stdout: ${stdout.trim()}`);
            if (stderr.trim())
                this.logger.warn(`⚠️ Python stderr: ${stderr.trim()}`);
        }
        catch (err) {
            this.logger.error(`❌ 키워드 추출 스크립트 실패: ${err.message}`);
            throw err;
        }
        try {
            this.logger.log('🔁 키워드 Map 재생성 중...');
            await this.keywordMapService.buildKeywordMap();
            this.logger.log('✅ 키워드 Map 최신화 완료');
        }
        catch (err) {
            this.logger.warn('⚠️ Map 재생성 실패', err);
        }
    }
};
exports.KeywordExtractionService = KeywordExtractionService;
exports.KeywordExtractionService = KeywordExtractionService = KeywordExtractionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [keyword_map_service_1.KeywordMapService])
], KeywordExtractionService);
//# sourceMappingURL=keyword-extraction.service.js.map
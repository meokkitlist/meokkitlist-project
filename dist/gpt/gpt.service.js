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
var GptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GptService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const openai_1 = __importDefault(require("openai"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
let GptService = GptService_1 = class GptService {
    cacheManager;
    logger = new common_1.Logger(GptService_1.name);
    openai;
    MODEL = process.env.GPT_MODEL?.trim() || 'gpt-3.5-turbo';
    MAX_RETURN = Number(process.env.GPT_KEYWORD_MAX_RETURN ?? 5);
    CACHE_TTL_SEC = Number(process.env.GPT_KEYWORD_CACHE_TTL_SEC ?? 3600);
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async extractKeywords(sentence) {
        const normalized = sentence.trim();
        const cacheKey = `gpt:keywords:${normalized}`;
        try {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
                this.logger.log(`🧠 [HIT] Cache 사용: "${cacheKey}"`);
                return cached;
            }
        }
        catch (err) {
            this.logger.warn(`⚠️ Cache 조회 실패: ${err}`);
        }
        const prompt = [
            '다음 문장에서 음식점 추천에 유용한 핵심 검색 키워드만 뽑아줘.',
            '반드시 JSON 배열 형태로만 응답해. 예: ["삼겹살","고기","구이","신선","맛집"]',
            `문장: "${normalized}"`,
            `최대 ${this.MAX_RETURN}개로 제한.`,
        ].join('\n');
        let keywords = [];
        try {
            this.logger.log(`🤖 GPT 호출 시작 (model: ${this.MODEL})`);
            const response = await this.openai.chat.completions.create({
                model: this.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '너는 음식점/맛집 검색 키워드 추출 전문가다. 반드시 JSON 배열로만 출력해.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
            });
            const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
            keywords = this.parseKeywordsFromResponse(raw);
            if (!Array.isArray(keywords) || keywords.length === 0) {
                this.logger.warn(`⚠️ GPT 응답 파싱 실패, fallback 사용. raw="${raw}"`);
                keywords = this.simpleFallbackExtract(normalized);
            }
        }
        catch (err) {
            this.logger.error('❌ GPT 호출 실패, fallback 사용', err);
            keywords = this.simpleFallbackExtract(normalized);
        }
        keywords = this.normalizeKeywordList(keywords).slice(0, this.MAX_RETURN);
        try {
            await this.cacheManager.set(cacheKey, keywords, this.CACHE_TTL_SEC);
            this.logger.log(`✅ [SET] Cache 저장 완료: "${cacheKey}"`);
        }
        catch (err) {
            this.logger.warn(`⚠️ Cache 저장 실패: ${err}`);
        }
        return keywords;
    }
    parseKeywordsFromResponse(raw) {
        try {
            const start = raw.indexOf('[');
            const end = raw.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                const json = raw.substring(start, end + 1);
                const arr = JSON.parse(json);
                if (Array.isArray(arr))
                    return arr.map(String);
            }
        }
        catch {
        }
        if (raw.includes(',')) {
            return raw
                .split(',')
                .map((s) => s.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
        }
        const only = raw.replace(/^\[|\]$/g, '').trim().replace(/^"|"$/g, '');
        return only ? [only] : [];
    }
    simpleFallbackExtract(sentence) {
        const tokens = sentence
            .split(/[\s,.;:"'()\-!?]+/)
            .map((w) => w.trim())
            .filter(Boolean);
        const kor = tokens.filter((w) => /^[가-힣]{2,}$/.test(w));
        const eng = tokens.filter((w) => /^[A-Za-z]{3,}$/.test(w));
        const merged = [...kor, ...eng];
        return this.normalizeKeywordList(merged).slice(0, this.MAX_RETURN);
    }
    normalizeKeywordList(arr) {
        const seen = new Set();
        const out = [];
        for (const v of arr) {
            if (v == null)
                continue;
            const s = String(v).trim();
            if (!s || seen.has(s))
                continue;
            seen.add(s);
            out.push(s);
        }
        return out;
    }
};
exports.GptService = GptService;
exports.GptService = GptService = GptService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], GptService);
//# sourceMappingURL=gpt.service.js.map
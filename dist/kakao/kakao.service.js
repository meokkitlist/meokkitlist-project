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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KakaoService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
let KakaoService = class KakaoService {
    kakaoKey = process.env.KAKAO_REST_KEY;
    async searchPlaces(query, lat, lng, radius) {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json`;
        const response = await axios_1.default.get(url, {
            params: {
                query,
                x: lng,
                y: lat,
                radius,
                sort: 'distance',
            },
            headers: {
                Authorization: `KakaoAK ${this.kakaoKey}`,
            },
        });
        return response.data.documents.map((place) => ({
            name: place.place_name,
            address: place.address_name,
            category: place.category_name,
            phone: place.phone,
            x: place.x,
            y: place.y,
            url: place.place_url,
        }));
    }
    async analyzeSentiment(text) {
        console.log('📩 분석할 텍스트:', text);
        const lower = text.toLowerCase();
        const negativeWords = ['별로', '불친절', '최악', '지저분'];
        const isNegative = negativeWords.some(word => lower.includes(word));
        return {
            sentiment: isNegative ? 'negative' : 'positive',
            score: isNegative ? 0.2 : 0.92,
        };
    }
};
exports.KakaoService = KakaoService;
exports.KakaoService = KakaoService = __decorate([
    (0, common_1.Injectable)()
], KakaoService);
//# sourceMappingURL=kakao.service.js.map
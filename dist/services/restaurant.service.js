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
var RestaurantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const restaurant_entity_1 = require("../entities/restaurant.entity");
const fs = __importStar(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
let RestaurantService = RestaurantService_1 = class RestaurantService {
    restaurantRepo;
    logger = new common_1.Logger(RestaurantService_1.name);
    constructor(restaurantRepo) {
        this.restaurantRepo = restaurantRepo;
    }
    async create(data) {
        const restaurant = this.restaurantRepo.create({
            ...data,
            keywords: data.keywords ?? null,
            review_count: data.review_count ?? 0,
            total_score: data.total_score ?? 0,
            naver_score: data.naver_score ?? 0,
            preview: data.preview ?? null,
        });
        return this.restaurantRepo.save(restaurant);
    }
    async uploadCsv(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV file not found: ${filePath}`);
        }
        const rows = [];
        const normalizeNumber = (value) => {
            if (value === null || value === undefined)
                return NaN;
            let s = String(value).trim();
            if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
                s = s.replace(/,/g, "");
            }
            else if (/^\d+,\d+$/.test(s)) {
                s = s.replace(",", ".");
            }
            s = s.replace(/[^0-9.\-+eE]/g, "");
            const n = Number(s);
            return Number.isFinite(n) ? n : NaN;
        };
        const normalizeHeader = (header) => {
            const h = header
                .replace(/\uFEFF/g, "")
                .normalize("NFKC")
                .trim()
                .replace(/\s+/g, "")
                .replace(/[(){}\[\]\-]/g, "")
                .toLowerCase();
            const aliasMap = {
                name: "name",
                이름: "name",
                storename: "name",
                address: "address",
                주소: "address",
                storeaddress: "address",
                lat: "lat",
                latitude: "lat",
                위도: "lat",
                lat위도: "lat",
                lon: "lon",
                lng: "lon",
                longitude: "lon",
                경도: "lon",
                lon경도: "lon",
                preview: "preview",
                미리보기: "preview",
            };
            return aliasMap[h] ?? h;
        };
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath, { encoding: "utf8" })
                .pipe((0, csv_parser_1.default)({
                bom: true,
                mapHeaders: ({ header }) => normalizeHeader(header),
                mapValues: ({ value }) => typeof value === "string" ? value.trim() : value,
            }))
                .on("data", (row) => {
                try {
                    this.logger.debug(`📌 CSV Row(raw): ${JSON.stringify(row)}`);
                    const nameRaw = row["name"] ?? "";
                    const addressRaw = row["address"] ?? "";
                    const latRaw = row["lat"];
                    const lonRaw = row["lon"];
                    const previewRaw = row["preview"];
                    const name = String(nameRaw || "").trim();
                    const address = String(addressRaw || "").trim();
                    const lat = normalizeNumber(latRaw);
                    const lon = normalizeNumber(lonRaw);
                    const preview = previewRaw !== undefined && previewRaw !== null
                        ? String(previewRaw).trim()
                        : undefined;
                    this.logger.debug(`   - Parsed → name: "${name}", address: "${address}", lat: ${lat}, lon: ${lon}`);
                    if (!name) {
                        this.logger.warn(`⚠️ 이름 누락, 스킵: ${JSON.stringify(row)}`);
                        return;
                    }
                    if (!address) {
                        this.logger.warn(`⚠️ 주소 누락, 스킵: ${JSON.stringify(row)}`);
                        return;
                    }
                    if (Number.isNaN(lat)) {
                        this.logger.warn(`⚠️ 위도 누락/형식오류, 스킵: ${JSON.stringify(row)}`);
                        return;
                    }
                    if (Number.isNaN(lon)) {
                        this.logger.warn(`⚠️ 경도 누락/형식오류, 스킵: ${JSON.stringify(row)}`);
                        return;
                    }
                    rows.push({
                        name,
                        address,
                        lat,
                        lon,
                        preview,
                        review_count: 0,
                        total_score: 0,
                        naver_score: 0,
                    });
                }
                catch (e) {
                    this.logger.error(`❌ Row parse error: ${e instanceof Error ? e.message : String(e)}`);
                }
            })
                .once("end", () => {
                this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row`);
                resolve();
            })
                .once("error", (err) => {
                this.logger.error(`❌ CSV Parse Error: ${err.message}`);
                reject(err);
            });
        });
        if (rows.length === 0) {
            this.logger.warn("⚠️ 유효한 row가 없어 저장하지 않습니다.");
            return { inserted: 0 };
        }
        const entities = rows.map((dto) => this.restaurantRepo.create(dto));
        await this.restaurantRepo.save(entities);
        try {
            await fs.promises.unlink(filePath);
            this.logger.log(`🗑️ 업로드 임시 파일 삭제: ${filePath}`);
        }
        catch (e) {
            this.logger.warn(`임시 파일 삭제 실패(무시 가능): ${e.message}`);
        }
        return { inserted: rows.length };
    }
};
exports.RestaurantService = RestaurantService;
exports.RestaurantService = RestaurantService = RestaurantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RestaurantService);
//# sourceMappingURL=restaurant.service.js.map
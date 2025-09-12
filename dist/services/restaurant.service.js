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
        const rows = [];
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV file not found: ${filePath}`);
        }
        const normalizeNumber = (v) => {
            if (v === null || v === undefined || v === '')
                return NaN;
            const s = String(v).trim().replace(/['"]/g, '');
            const fixed = s.replace(',', '.');
            return parseFloat(fixed);
        };
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (row) => {
                try {
                    this.logger.debug(`📌 CSV Row: ${JSON.stringify(row)}`);
                    const name = row.name ||
                        row.Name ||
                        row['이름'] ||
                        row['store_name'] ||
                        '';
                    const address = row.address ||
                        row.Address ||
                        row['주소'] ||
                        row['store_address'] ||
                        '';
                    const lat = normalizeNumber(row.lat ||
                        row.latitude ||
                        row.Lat ||
                        row['위도'] ||
                        row['lat(위도)']);
                    const lon = normalizeNumber(row.lon ||
                        row.lng ||
                        row.Lon ||
                        row.longitude ||
                        row['경도'] ||
                        row['lon(경도)']);
                    const preview = row.preview || row.Preview || row['미리보기'] || undefined;
                    if (!name || !address || isNaN(lat) || isNaN(lon)) {
                        this.logger.warn(`⚠️ Skip row (invalid): ${JSON.stringify(row)}`);
                        return;
                    }
                    rows.push({
                        name: String(name).trim(),
                        address: String(address).trim(),
                        lat,
                        lon,
                        preview: preview ? String(preview).trim() : undefined,
                        review_count: 0,
                        total_score: 0,
                        naver_score: 0,
                    });
                }
                catch (e) {
                    this.logger.error(`❌ Row parse error: ${e}`);
                }
            })
                .on('end', () => {
                this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row`);
                resolve();
            })
                .on('error', (err) => {
                this.logger.error(`❌ CSV Parse Error: ${err.message}`);
                reject(err);
            });
        });
        if (rows.length === 0) {
            this.logger.warn('⚠️ 유효한 row가 없어 저장하지 않음');
            return { inserted: 0 };
        }
        await this.restaurantRepo.save(rows);
        try {
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (row) => {
                    this.logger.debug(`📌 CSV Row: ${JSON.stringify(row)}`);
                })
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });
        }
        catch (e) {
            throw new Error(`CSV 업로드 실패: ${e.message}`);
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
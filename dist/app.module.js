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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const typeorm_1 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const ioredis_1 = require("@nestjs-modules/ioredis");
const redisStore = __importStar(require("cache-manager-ioredis"));
const platform_express_1 = require("@nestjs/platform-express");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const kakao_controller_1 = require("./kakao/kakao.controller");
const kakao_service_1 = require("./kakao/kakao.service");
const sentiment_controller_1 = require("./controllers/sentiment.controller");
const sentiment_service_1 = require("./services/sentiment.service");
const review_controller_1 = require("./controllers/review.controller");
const review_service_1 = require("./services/review.service");
const search_controller_1 = require("./controllers/search.controller");
const search_service_1 = require("./services/search.service");
const gpt_controller_1 = require("./gpt/gpt.controller");
const gpt_service_1 = require("./gpt/gpt.service");
const keyword_controller_1 = require("./controllers/keyword.controller");
const keyword_extraction_service_1 = require("./services/keyword-extraction.service");
const keyword_map_service_1 = require("./services/keyword-map.service");
const redis_controller_1 = require("./controllers/redis.controller");
const review_entity_1 = require("./entities/review.entity");
const restaurant_entity_1 = require("./entities/restaurant.entity");
const auth_module_1 = require("./auth/auth.module");
const restaurant_controller_1 = require("./controllers/restaurant.controller");
const restaurant_service_1 = require("./services/restaurant.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            axios_1.HttpModule,
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => {
                    if (process.env.DATABASE_URL) {
                        return {
                            type: 'postgres',
                            url: process.env.DATABASE_URL,
                            entities: [review_entity_1.Review, restaurant_entity_1.Restaurant],
                            autoLoadEntities: true,
                            synchronize: true,
                            ssl: { rejectUnauthorized: false },
                        };
                    }
                    else {
                        return {
                            type: process.env.DB_TYPE || 'sqlite',
                            database: process.env.DB_PATH || 'meokkitlist.sqlite',
                            entities: [review_entity_1.Review, restaurant_entity_1.Restaurant],
                            synchronize: process.env.NODE_ENV === 'development' ||
                                process.env.NODE_ENV === 'dev' ||
                                process.env.NODE_ENV === undefined
                                ? true
                                : false,
                            autoLoadEntities: true,
                        };
                    }
                },
            }),
            typeorm_1.TypeOrmModule.forFeature([review_entity_1.Review, restaurant_entity_1.Restaurant]),
            platform_express_1.MulterModule.register({}),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: async () => ({
                    store: redisStore,
                    host: process.env.REDIS_HOST || '127.0.0.1',
                    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
                    password: process.env.REDIS_PASSWORD || undefined,
                    ttl: 60 * 60,
                }),
            }),
            ioredis_1.RedisModule.forRootAsync({
                useFactory: async () => ({
                    type: 'single',
                    options: {
                        host: process.env.REDIS_HOST || '127.0.0.1',
                        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
                        password: process.env.REDIS_PASSWORD || undefined,
                        maxRetriesPerRequest: null,
                        enableReadyCheck: false,
                    },
                }),
            }),
            auth_module_1.AuthModule,
        ],
        controllers: [
            app_controller_1.AppController,
            kakao_controller_1.KakaoController,
            sentiment_controller_1.SentimentController,
            review_controller_1.ReviewController,
            search_controller_1.SearchController,
            gpt_controller_1.GptController,
            keyword_controller_1.KeywordController,
            redis_controller_1.RedisController,
            restaurant_controller_1.RestaurantController,
        ],
        providers: [
            app_service_1.AppService,
            kakao_service_1.KakaoService,
            sentiment_service_1.SentimentService,
            review_service_1.ReviewService,
            search_service_1.SearchService,
            gpt_service_1.GptService,
            keyword_extraction_service_1.KeywordExtractionService,
            keyword_map_service_1.KeywordMapService,
            restaurant_service_1.RestaurantService,
        ],
        exports: [keyword_map_service_1.KeywordMapService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
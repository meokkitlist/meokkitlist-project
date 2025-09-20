// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import * as redisStore from 'cache-manager-ioredis';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Kakao
import { KakaoController } from './kakao/kakao.controller';
import { KakaoService } from './kakao/kakao.service';

// Sentiment
import { SentimentController } from './controllers/sentiment.controller';
import { SentimentService } from './services/sentiment.service';

// Review
import { ReviewController } from './controllers/review.controller';
import { ReviewService } from './services/review.service';

// Search
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';

// GPT
import { GptController } from './gpt/gpt.controller';
import { GptService } from './gpt/gpt.service';

// Keyword
import { KeywordController } from './controllers/keyword.controller';
import { KeywordExtractionService } from './services/keyword-extraction.service';
import { KeywordMapService } from './services/keyword-map.service';

// Redis
import { RedisController } from './controllers/redis.controller';

// Restaurant
import { RestaurantController } from './controllers/restaurant.controller';
import { RestaurantService } from './services/restaurant.service';

// Entities
import { Review } from './entities/review.entity';
import { Restaurant } from './entities/restaurant.entity';

// ✅ 인증 모듈
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 1) .env 로드
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2) HTTP 모듈
    HttpModule,

    // 3) DB 연결 (PostgreSQL 우선)
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE as any) || 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Review, Restaurant],
      autoLoadEntities: true,
      synchronize: true, // ⚠️ 개발/졸과 시연용으로 true, 운영에서는 migration 권장
    }),

    // 4) 엔티티 레포지토리 등록
    TypeOrmModule.forFeature([Review, Restaurant]),

    // 5) 전역 캐시 (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: redisStore as any,
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        ttl: 60 * 60,
      }),
    }),

    // 6) Redis 클라이언트
    RedisModule.forRootAsync({
      useFactory: async (): Promise<RedisModuleOptions> => ({
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

    // 7) 인증 모듈
    AuthModule,
  ],

  controllers: [
    AppController,
    KakaoController,
    SentimentController,
    ReviewController,
    SearchController,
    GptController,
    KeywordController,
    RedisController,
    RestaurantController,
  ],

  providers: [
    AppService,
    KakaoService,
    SentimentService,
    ReviewService,
    SearchService,
    GptService,
    KeywordExtractionService,
    KeywordMapService,
    RestaurantService,
  ],

  exports: [KeywordMapService],
})
export class AppModule {}

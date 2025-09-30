// src/services/search.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { SearchKeywordDto } from '../dto/search-keyword.dto';
import { SearchResultDto } from '../dto/search-result.dto';
import { GptService } from '../gpt/gpt.service';
import { KeywordMapService } from './keyword-map.service';
import { SCORE_WEIGHTS } from '../config/ranking.config';

type LatLng = { lat: number; lon: number };

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    private readonly gptService: GptService,
    private readonly keywordMapService: KeywordMapService,
  ) {}

  async onModuleInit() {
    await this.keywordMapService.buildKeywordMap();
  }

  async searchByKeyword(dto: SearchKeywordDto & { keywords?: string[] }) {
    const { keyword, userPosition } = dto;
    const rangeKm = Number.isFinite(Number(dto.range)) ? Number(dto.range) : 5;

    // -------------------------
    // 1. 키워드 추출 + 병합
    // -------------------------
    let extractedKeywords: string[] = [];

    if (dto.keywords && dto.keywords.length > 0) {
      this.logger.log(`📌 키워드 배열 입력 받음: ${JSON.stringify(dto.keywords)}`);
      extractedKeywords.push(...dto.keywords);
    }

    if (keyword) {
      const gptResults = await this.gptService.extractKeywords(keyword);
      this.logger.log(`🤖 GPT 문장 기반 키워드 추출: ${JSON.stringify(gptResults)}`);
      extractedKeywords.push(...gptResults);
    }

    if (keyword) {
      const tokens = keyword
        .split(/[\s,]+/).map((s) => s.replace(/[^\p{L}\p{N}]/gu, '')).filter((s) => s.length >= 2);
      extractedKeywords.push(...tokens);
    }

    const SYNONYMS: Record<string, string[]> = {
      국물: ['국밥', '찌개', '탕', '라멘', '라면', '우동', '칼국수', '해장국', '곰탕', '설렁탕'],
      삼겹살: ['고기', '돼지고기', '바베큐', '숯불', '구이', '생삼겹', '항정살'],
      카페: ['커피', '디저트', '브런치'],
    };

    const expanded: string[] = [];
    extractedKeywords.forEach((k) => {
      if (SYNONYMS[k]) expanded.push(...SYNONYMS[k]);
    });

    const normalize = (k: string) => this.keywordMapService['normalizeKeyword'](k);
    const kwList = [...new Set([...extractedKeywords, ...expanded])]
      .map(normalize)
      .filter(Boolean);

    if (!kwList.length) {
      return {
        meta: { query: { keyword, userPosition, range: rangeKm }, resultCount: 0 },
        data: [],
        message: '추천에 사용할 키워드를 찾을 수 없었어요.',
      };
    }

    // -------------------------
    // 2. 후보 식당 수집
    // -------------------------
    const restaurantIdSet = new Set<number>();
    for (const kw of kwList) {
      const ids = this.keywordMapService.getRestaurantIdsByKeyword(kw);
      ids.forEach((id) => restaurantIdSet.add(id));
    }

    const idList = [...restaurantIdSet];
    let candidates: Restaurant[] = [];
    if (idList.length > 0) {
      candidates = await this.restaurantRepo.find({ where: { id: In(idList) } });
    }

    // -------------------------
    // 3. 스코어 계산 + 거리 필터
    // -------------------------
    const needles = kwList;
    let enriched = candidates.map((r) => {
      const rKeywords = this.safeParseKeywords((r as any).keywords);
      const { score: matchScore, matched } = this.calcMatchScore(rKeywords, needles);

      const reviewCount = r.review_count ?? 0;
      const sentimentScore = r.sentiment_score ?? 0;
      const totalScore = r.total_score ?? 0;
      const naverScore = r.naver_score ?? 0;

      let distanceKm: number | null = null;
      if (userPosition?.lat && userPosition?.lon && r.lat && r.lon) {
        distanceKm = this.haversine(
          { lat: userPosition.lat, lon: userPosition.lon },
          { lat: Number(r.lat), lon: Number(r.lon) },
        );
      }

      const finalScore = this.calcFinalScore({
        matchScore,
        totalScore,
        reviewCount,
        sentimentScore,
      });

      this.logger.log(
        `🔍 [${r.name}] matchScore=${matchScore}, reviewCount=${reviewCount}, sentimentScore=${sentimentScore}, matched=${matched.join(',')}`,
      );

      return {
        raw: r,
        matchScore,
        totalScore,
        reviewCount,
        sentimentScore,
        naverScore,
        finalScore,
        keywordsMatched: matched,
        distanceKm,
      };
    });

    if (rangeKm && userPosition?.lat && userPosition?.lon) {
      const rangeMeters = Number(rangeKm) * 1000;
      enriched = enriched.filter(
        (e) => e.distanceKm !== null && e.distanceKm! * 1000 <= rangeMeters,
      );
    }

    enriched.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

    const TOPN = 10;
    const top = enriched.slice(0, TOPN);

    // -------------------------
    // ✅ DTO 생성자 활용
    // -------------------------
    return {
      meta: {
        query: { keyword, extractedKeywords: needles, userPosition, range: rangeKm },
        resultCount: top.length,
      },
      data: top.map((e, i) => {
        const r = e.raw as Restaurant;
        return new SearchResultDto({
          ...r,
          lat: r.lat,   // 좌표 추가
          lon: r.lon,   // 좌표 추가
          preview: r.preview 
            ?? (Array.isArray((r as any).reviews) && (r as any).reviews.length > 0 
                  ? (r as any).reviews[0].content 
                  : null),   // preview 매핑 추가
          reviewCount: r.review_count,
          sentimentScore: r.sentiment_score,
          naverScore: r.naver_score,
          finalScore: e.finalScore,
          relatedKeyword: this.safeParseKeywords(r.keywords),
          keywordsMatched: e.keywordsMatched,
          distanceKm: e.distanceKm,
          rank: i + 1,
    });
      }),
    };
  }

  private haversine(a: LatLng, b: LatLng): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private safeParseKeywords(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  }

  private calcMatchScore(restaurantKeywords: string[], needleKeywords: string[]) {
    const rset = new Set(
      restaurantKeywords.map((k) => this.keywordMapService['normalizeKeyword'](k)),
    );
    let score = 0;
    const matched: string[] = [];

    for (const kw of needleKeywords) {
      const k = kw.trim().toLowerCase();
      const hit = Array.from(rset).some(
        (rk) =>
          rk === k || rk.includes(k) || k.includes(rk) || rk.split(' ').includes(k),
      );
      if (hit) {
        score += 1;
        matched.push(k);
      }
    }
    return { score, matched };
  }

  private calcFinalScore({
    matchScore,
    totalScore,
    reviewCount,
    sentimentScore,
  }: {
    matchScore: number;
    totalScore: number;
    reviewCount: number;
    sentimentScore: number;
  }): number {
    return (
      matchScore * SCORE_WEIGHTS.matchScore +
      totalScore * SCORE_WEIGHTS.totalScore +
      reviewCount * SCORE_WEIGHTS.reviewCount +
      sentimentScore * SCORE_WEIGHTS.sentimentScore
    );
  }
}

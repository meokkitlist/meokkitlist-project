import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { SearchKeywordDto } from '../dto/search-keyword.dto';
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

  getRestaurantIdsByKeyword(keyword: string): number[] {
    return this.keywordMapService.getRestaurantIdsByKeyword(keyword);
  }

  getFullKeywordMap(): Record<string, number[]> {
    return Object.fromEntries(this.keywordMapService.getMap());
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
    const rset = new Set(restaurantKeywords.map((k) => k.trim()));
    let score = 0;
    const matched: string[] = [];
    for (const kw of needleKeywords) {
      const k = kw.trim();
      const hit =
        rset.has(k) ||
        Array.from(rset).some((rk) => rk.includes(k) || k.includes(rk));
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

  async searchByKeyword(dto: SearchKeywordDto & { keywords?: string[] }) {
  const { keyword, userPosition, range } = dto;

  let extractedKeywords: string[] = [];

  if (dto.keywords && dto.keywords.length > 0) {
    this.logger.log(`📌 키워드 배열 입력 받음: ${JSON.stringify(dto.keywords)}`);

    const knownKeywords: string[] = [];
    const unknownKeywords: string[] = [];

    for (const k of dto.keywords) {
      if (this.keywordMapService.getRestaurantIdsByKeyword(k).length > 0) {
        knownKeywords.push(k);
      } else {
        unknownKeywords.push(k);
      }
    }

    let expandedKeywords: string[] = [];

    if (unknownKeywords.length > 0) {
      this.logger.log(`🤖 GPT 호출 필요: ${JSON.stringify(unknownKeywords)}`);
      const gptResults = await this.gptService.extractKeywords(unknownKeywords.join(', '));

      // GPT 결과 중 Map에 있는 것만 필터
      expandedKeywords = gptResults.filter(
        (k) => this.keywordMapService.getRestaurantIdsByKeyword(k).length > 0,
      );

      this.logger.log(`🔁 GPT 유사어 중 사용 가능한 키워드: ${JSON.stringify(expandedKeywords)}`);
    }

    extractedKeywords = [...knownKeywords, ...expandedKeywords];

  } else if (keyword) {
    extractedKeywords = await this.gptService.extractKeywords(keyword);
    this.logger.log(`🤖 GPT 문장 기반 키워드 추출: ${JSON.stringify(extractedKeywords)}`);
  }

  if (!extractedKeywords || extractedKeywords.length === 0) {
    return {
      meta: {
        query: { keyword, userPosition, range },
        resultCount: 0,
      },
      data: [],
      message: '추천에 사용할 키워드를 찾을 수 없었어요.',
    };
  }

    const restaurantIdSet = new Set<number>();
    for (const kw of extractedKeywords) {
      const ids = this.keywordMapService.getRestaurantIdsByKeyword(kw);
      ids.forEach(id => restaurantIdSet.add(id));
    }

    const idList = [...restaurantIdSet];

    let candidates: Restaurant[] = [];

    if (idList.length > 0) {
      candidates = await this.restaurantRepo.find({
        where: { id: In(idList) },
      });
    }

    if (candidates.length === 0 && keyword) {
      candidates = await this.restaurantRepo
        .createQueryBuilder('r')
        .where('r.keywords LIKE :kw', { kw: `%${keyword}%` })
        .getMany();
    }

    const needles = extractedKeywords;

    let enriched = candidates.map((r) => {
      const rKeywords = this.safeParseKeywords((r as any).keywords);
      const { score: matchScore, matched } = this.calcMatchScore(rKeywords, needles);

      const totalScore = (r as any).total_score ?? 0;
      const reviewCount = (r as any).review_count ?? 0;
      const sentimentScore = (r as any).sentiment_score ?? 0;

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

      return {
        raw: r,
        matchScore,
        totalScore,
        reviewCount,
        sentimentScore,
        finalScore,
        keywordsMatched: matched,
        distanceKm,
      };
    });

    if (range && userPosition?.lat && userPosition?.lon) {
      enriched = enriched.filter(
        (e) => e.distanceKm !== null && (e.distanceKm as number) <= Number(range),
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

    return {
      meta: {
        query: {
          keyword,
          extractedKeywords: needles,
          userPosition,
          range,
        },
        resultCount: top.length,
      },
      data: top.map((e, i) => {
        const r = e.raw as Restaurant;
        return {
          rank: i + 1,
          marketName: (r as any).name,
          marketAddress: (r as any).address,
          marketUrl:
            r.lat && r.lon
              ? `https://map.kakao.com/link/to/${encodeURIComponent((r as any).name)},${r.lat},${r.lon}`
              : null,
          relatedKeyword: this.safeParseKeywords((r as any).keywords),
          keywordsMatched: e.keywordsMatched,
          matchScore: e.matchScore,
          totalScore: e.totalScore,
          reviewCount: e.reviewCount,
          sentimentScore: e.sentimentScore,
          finalScore: e.finalScore,
          naverScore: (r as any).naver_score ?? null,
          coordinates: {
            lat: (r as any).lat ?? null,
            lon: (r as any).lon ?? null,
          },
          distanceKm: e.distanceKm,
        };
      }),
    };
  }
}

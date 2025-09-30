import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Restaurant } from "../entities/restaurant.entity";
import { Review } from "../entities/review.entity";              // ✅ ADD
import { SearchKeywordDto } from "../dto/search-keyword.dto";
import { SearchResultDto } from "../dto/search-result.dto";
import { GptService } from "../gpt/gpt.service";
import { KeywordMapService } from "./keyword-map.service";
import { SCORE_WEIGHTS } from "../config/ranking.config";

type LatLng = { lat: number; lon: number };

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Review)                                   // ✅ ADD
    private readonly reviewRepo: Repository<Review>,            // ✅ ADD
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

  async searchByKeyword(dto: SearchKeywordDto & { keywords?: string[] }) {
    const { keyword, userPosition, range } = dto;

    // -------------------------
    // 1) 키워드 추출 + 병합
    // -------------------------
    let extractedKeywords: string[] = [];

    if (dto.keywords?.length) {
      this.logger.log(`📌 키워드 배열 입력: ${JSON.stringify(dto.keywords)}`);
      extractedKeywords.push(...dto.keywords);
    }

    if (keyword) {
      const gptResults = await this.gptService.extractKeywords(keyword);
      this.logger.log(`🤖 GPT 키워드: ${JSON.stringify(gptResults)}`);
      extractedKeywords.push(...gptResults);
    }

    if (keyword) {
      const tokens = keyword
        .split(/[\s,]+/)
        .map((s) => s.replace(/[^\p{L}\p{N}]/gu, ""))
        .filter((s) => s.length >= 2);
      extractedKeywords.push(...tokens);
    }

    const SYNONYMS: Record<string, string[]> = {
      "국물": ["국밥", "찌개", "탕", "라멘", "라면", "우동", "칼국수", "해장국", "곰탕", "설렁탕"],
      "삼겹살": ["고기", "돼지고기", "바베큐", "숯불", "구이", "생삼겹", "항정살"],
      "카페": ["커피", "디저트", "브런치"],
    };
    const expanded: string[] = [];
    extractedKeywords.forEach((k) => { if (SYNONYMS[k]) expanded.push(...SYNONYMS[k]); });

    const kwList = [...new Set([...extractedKeywords, ...expanded])];

    if (!kwList.length) {
      return {
        meta: { query: { keyword, userPosition, range }, resultCount: 0 },
        data: [],
        message: "추천에 사용할 키워드를 찾을 수 없었어요.",
      };
    }

    // -------------------------
    // 2) 후보 식당 수집
    // -------------------------
    const idSet = new Set<number>();
    for (const kw of kwList) this.keywordMapService.getRestaurantIdsByKeyword(kw).forEach((id) => idSet.add(id));

    const idList = [...idSet];
    let candidates: Restaurant[] = [];

    if (idList.length) {
      candidates = await this.restaurantRepo.find({ where: { id: In(idList) } });
    }

    // ✅ LIKE Fallback
    if (!candidates.length) {
      const likeMap = new Map<number, Restaurant>();

      if (keyword) {
        const q = `%${keyword}%`;
        const hit = await this.restaurantRepo.createQueryBuilder("r")
          .where("r.name ILIKE :q", { q })
          .orWhere("r.address ILIKE :q", { q })
          .orWhere("r.preview ILIKE :q", { q })
          .orWhere("CAST(r.keywords AS TEXT) ILIKE :q", { q })
          .getMany();
        hit.forEach((r) => likeMap.set((r as any).id, r));
      }

      for (const k of kwList) {
        const qk = `%${k}%`;
        const hit = await this.restaurantRepo.createQueryBuilder("r")
          .where("r.name ILIKE :qk", { qk })
          .orWhere("r.address ILIKE :qk", { qk })
          .orWhere("r.preview ILIKE :qk", { qk })
          .orWhere("CAST(r.keywords AS TEXT) ILIKE :qk", { qk })
          .getMany();
        hit.forEach((r) => likeMap.set((r as any).id, r));
      }

      candidates = [...likeMap.values()];
    }

    // -------------------------
    // 2-1) ❗후보 식당에 리뷰 집계 붙이기 (핵심 수정)
    // -------------------------
    const candidateIds = candidates.map((r) => Number((r as any).id));
    const statsMap = new Map<number, { review_count: number; sentiment_score: number }>();

    if (candidateIds.length) {
      const stats = await this.reviewRepo
        .createQueryBuilder("rv")
        .select("rv.restaurant_id", "restaurant_id")
        .addSelect("COUNT(*)", "review_count")
        .addSelect("ROUND(AVG(rv.score), 1)", "sentiment_score")
        .where("rv.restaurant_id IN (:...ids)", { ids: candidateIds })
        .andWhere("rv.score IS NOT NULL")
        .groupBy("rv.restaurant_id")
        .getRawMany();

      for (const s of stats) {
        statsMap.set(Number(s.restaurant_id), {
          review_count: Number(s.review_count),
          sentiment_score: Number(s.sentiment_score),
        });
      }
    }

    // -------------------------
    // 3) 스코어 계산
    // -------------------------
    const needles = kwList;

    let enriched = candidates.map((r) => {
      const id = Number((r as any).id);
      const rKeywords = this.safeParseKeywords((r as any).keywords);
      const { score: matchScore, matched } = this.calcMatchScore(rKeywords, needles);

      // ✅ 우선순위: 집계값 → Restaurant 필드 → 0
      const agg = statsMap.get(id);
      const reviewCount =
        agg?.review_count ?? (Number((r as any).review_count) || 0);
      const sentimentScore =
        agg?.sentiment_score ?? (Number((r as any).sentiment_score) || 0);

      const totalScore = Number((r as any).total_score ?? 0);

      let distanceKm: number | null = null;
      if (userPosition?.lat && userPosition?.lon && (r as any).lat && (r as any).lon) {
        distanceKm = this.haversine(
          { lat: userPosition.lat, lon: userPosition.lon },
          { lat: Number((r as any).lat), lon: Number((r as any).lon) },
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

    // ✅ range(m) 필터 (distanceKm → m 변환)
    if (range && userPosition?.lat && userPosition?.lon) {
      const rangeMeters = Number(range);
      enriched = enriched.filter((e) => e.distanceKm !== null && e.distanceKm! * 1000 <= rangeMeters);
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
    // 4) 결과 DTO
    // -------------------------
    return {
      meta: {
        query: { keyword, extractedKeywords: needles, userPosition, range },
        resultCount: top.length,
      },
      data: top.map((e, i): SearchResultDto => {
        const r = e.raw as Restaurant;
        return {
          id: (r as any).id,
          name: (r as any).name,
          address: (r as any).address,
          preview: (r as any).preview ?? null,
          reviewCount: e.reviewCount,            // ✅ 집계 반영
          sentimentScore: e.sentimentScore,      // ✅ 집계 반영
          finalScore: e.finalScore,
          marketUrl:
            (r as any).lat && (r as any).lon
              ? `https://map.kakao.com/link/to/${encodeURIComponent((r as any).name)},${(r as any).lat},${(r as any).lon}`
              : undefined,
          relatedKeyword: this.safeParseKeywords((r as any).keywords),
          keywordsMatched: e.keywordsMatched,
          naverScore: (r as any).naver_score ?? null,
          coordinates: {
            lat: (r as any).lat ?? null,
            lon: (r as any).lon ?? null,
          },
          distanceKm: e.distanceKm,
          rank: i + 1,
        };
      }),
    };
  }

  // -------------------------
  // 헬퍼들
  // -------------------------
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
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
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
      const hit = rset.has(k) || Array.from(rset).some((rk) => rk.includes(k) || k.includes(rk));
      if (hit) { score += 1; matched.push(k); }
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

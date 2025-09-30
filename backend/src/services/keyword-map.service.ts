import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Restaurant } from "../entities/restaurant.entity";

@Injectable()
export class KeywordMapService {
  private readonly logger = new Logger(KeywordMapService.name);
  private keywordToRestaurantMap: Map<string, number[]> = new Map();

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  // ✅ 전체 Map 재생성
  async buildKeywordMap(): Promise<void> {
    this.logger.log("🔁 키워드 → 가게 Map 재생성 시작");

    const allRestaurants = await this.restaurantRepo.find();
    const newMap = new Map<string, number[]>();

    for (const restaurant of allRestaurants) {
      if (!restaurant.keywords || (restaurant.keywords as any).length === 0)
        continue;

      const keywordList: string[] = this.safeParseKeywords(restaurant.keywords);

      for (const keyword of keywordList) {
        const normalized = this.normalizeKeyword(keyword);
        if (!normalized) continue;

        if (!newMap.has(normalized)) {
          newMap.set(normalized, []);
        }
        if (!newMap.get(normalized)!.includes(restaurant.id)) {
          newMap.get(normalized)!.push(restaurant.id);
        }
      }
    }

    this.keywordToRestaurantMap = newMap;
    this.logger.log(
      `✅ Map 빌드 완료: ${this.keywordToRestaurantMap.size}개 키워드`,
    );
  }

  // ✅ 단일 키워드 → 관련 가게 id[]
  getRestaurantIdsByKeyword(keyword: string): number[] {
    const normalized = this.normalizeKeyword(keyword);
    this.logger.log(`🔍 키워드 조회: "${keyword}" → "${normalized}"`);
    return this.keywordToRestaurantMap.get(normalized) || [];
  }

  // ✅ 전체 Map 조회 (디버깅용)
  getMap(): Map<string, number[]> {
    return this.keywordToRestaurantMap;
  }

  // ✅ 부분 검색 (GPT 실패 시 fallback)
  searchKeywords(q: string, limit = 10): string[] {
    const Q = this.normalizeKeyword(q);
    if (!Q) return [];

    const keys = Array.from(this.keywordToRestaurantMap.keys());
    const hits = keys.filter((k) => k.includes(Q));
    return hits.slice(0, limit);
  }

  // ✅ 전체 키워드 목록
  getAllKeywordsList(): string[] {
    return Array.from(this.keywordToRestaurantMap.keys());
  }

  // ✅ 문자열 or 배열 → string[]
  private safeParseKeywords(raw: any): string[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((k) => String(k).trim()).filter(Boolean);
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((k) => String(k).trim()).filter(Boolean);
        }
      } catch {
        return raw
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  // ✅ 핵심: 키워드 정규화 함수 (수정)
  private normalizeKeyword(k: string): string {
    // 기존: return k.trim().toLowerCase().replace(/\s+/g, "");
    // 수정: 띄어쓰기는 유지, 소문자만
    return k.trim().toLowerCase();
  }
}

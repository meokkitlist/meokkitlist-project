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
      if (!restaurant.keywords || restaurant.keywords.length === 0) continue;

      const keywordList: string[] = this.safeParseKeywords(restaurant.keywords);

      for (const keyword of keywordList) {
        const trimmed = keyword.trim();
        if (!newMap.has(trimmed)) {
          newMap.set(trimmed, []);
        }
        if (!newMap.get(trimmed)!.includes(restaurant.id)) {
          newMap.get(trimmed)!.push(restaurant.id);
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
    return this.keywordToRestaurantMap.get(keyword.trim()) || [];
  }

  // ✅ 전체 Map 조회 (디버깅용)
  getMap(): Map<string, number[]> {
    return this.keywordToRestaurantMap;
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
}

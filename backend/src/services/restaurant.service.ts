import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Restaurant } from "../entities/restaurant.entity";
import { CreateRestaurantDto } from "../dto/create-restaurant.dto";
import * as fs from "fs";
import * as csv from "csv-parser";

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async create(data: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = this.restaurantRepo.create({
      ...data,
      lat: this.toNullableNumber(data.lat),
      lon: this.toNullableNumber(data.lon),
      keywords: data.keywords ?? null,
      review_count: data.review_count ?? 0,
      total_score: data.total_score ?? 0,
      sentiment_score: (data as any).sentiment_score ?? 0, // ✅ 추가
      naver_score: data.naver_score ?? 0,
      preview: data.preview ?? null,
      url: data.url ?? null,
      review: data.review ?? null,
    });
    return this.restaurantRepo.save(restaurant);
  }

  async findByName(name: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({ where: { name } });
  }

  async getOrCreateRestaurantByName(name: string): Promise<Restaurant> {
    let restaurant = await this.findByName(name);
    if (restaurant) return restaurant;

    this.logger.warn(`⚠️ 가게 "${name}" DB에 없음 → 신규 생성`);
    restaurant = this.restaurantRepo.create({
      name,
      address: "",
      lat: null,
      lon: null,
      keywords: [],
      review_count: 0,
      total_score: 0,
      sentiment_score: 0, // ✅ 추가
    });

    return this.restaurantRepo.save(restaurant);
  }

  async uploadCsv(filePath: string): Promise<{
    inserted: number;
    skipped: number;
    withCoords: number;
    withoutCoords: number;
  }> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const rows: CreateRestaurantDto[] = [];
    let skipped = 0;

    const normalizeNumber = (value: unknown): number => {
      if (value === null || value === undefined) return NaN;
      let s = String(value).trim();
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
      else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
      s = s.replace(/[^0-9.\-+eE]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    };

    const toKeywordsArray = (raw: any): string[] | null => {
      if (raw === null || raw === undefined) return null;
      const s = String(raw).trim();
      if (!s) return null;
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        const parts = s.split(",").map((v) => v.trim()).filter(Boolean);
        return parts.length > 0 ? parts : null;
      }
      return null;
    };

    const normalizeHeader = (header: string): string => {
      const h = header
        .replace(/\uFEFF/g, "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, "")
        .replace(/[(){}\[\]\-]/g, "")
        .toLowerCase();

      const aliasMap: Record<string, string> = {
        id: "id",
        name: "name",
        storename: "name",
        address: "address",
        url: "url",
        lat: "lat",
        latitude: "lat",
        lon: "lon",
        lng: "lon",
        longitude: "lon",
        review: "review",
        review_count: "review_count",
        reviewcount: "review_count",
        naver_score: "naver_score",
        naverscore: "naver_score",
        preview: "preview",
        keywords: "keywords",
        sentiment_score: "sentiment_score", // ✅ 추가
      };

      return aliasMap[h] ?? h;
    };

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: "utf8" })
        .pipe(
          csv({
            mapHeaders: ({ header }) => normalizeHeader(header),
            mapValues: ({ value }) =>
              typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : value,
          }),
        )
        .on("data", (row: any) => {
          try {
            const name = String(row["name"] ?? "").trim();
            if (!name) {
              skipped++;
              this.logger.warn(`⚠️ name 누락 → 스킵: ${JSON.stringify(row)}`);
              return;
            }

            const latRaw = normalizeNumber(row["lat"]);
            const lonRaw = normalizeNumber(row["lon"]);
            const lat = Number.isFinite(latRaw) ? latRaw : null;
            const lon = Number.isFinite(lonRaw) ? lonRaw : null;

            const review_countRaw = normalizeNumber(row["review_count"]);
            const naver_scoreRaw = normalizeNumber(row["naver_score"]);
            const sentiment_scoreRaw = normalizeNumber(row["sentiment_score"]);

            const review_count = Number.isFinite(review_countRaw) ? review_countRaw : 0;
            const naver_score = Number.isFinite(naver_scoreRaw) ? naver_scoreRaw : 0;
            const sentiment_score = Number.isFinite(sentiment_scoreRaw)
              ? sentiment_scoreRaw
              : 0;

            const keywords = toKeywordsArray(row["keywords"]);

            rows.push({
              name,
              address: String(row["address"] ?? "").trim(),
              lat,
              lon,
              preview: row["preview"] ?? null,
              url: row["url"] ?? null,
              review: row["review"] ?? null,
              review_count,
              total_score: 0,
              sentiment_score, // ✅ 추가
              naver_score,
              keywords: keywords ?? undefined,
            } as CreateRestaurantDto & { sentiment_score?: number });
          } catch (e) {
            skipped++;
            this.logger.error(
              `❌ Row parse error: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        })
        .once("end", () => {
          this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row (skipped=${skipped})`);
          resolve();
        })
        .once("error", (err: Error) => {
          this.logger.error(`❌ CSV Parse Error: ${err.message}`);
          reject(err);
        });
    });

    if (rows.length === 0) {
      this.logger.warn("⚠️ 유효한 row가 없어 저장하지 않습니다.");
      await this.safeUnlink(filePath);
      return { inserted: 0, skipped, withCoords: 0, withoutCoords: 0 };
    }

    const entities = rows.map((dto) =>
      this.restaurantRepo.create({
        ...dto,
        lat: this.toNullableNumber(dto.lat),
        lon: this.toNullableNumber(dto.lon),
        keywords: dto.keywords ?? null,
      }),
    );

    await this.restaurantRepo.save(entities);

    const withCoords = entities.filter((e) => e.lat != null && e.lon != null).length;
    const withoutCoords = entities.length - withCoords;

    await this.safeUnlink(filePath);
    this.logger.log(
      `📦 저장 완료: inserted=${entities.length}, withCoords=${withCoords}, withoutCoords=${withoutCoords}, skipped=${skipped}`,
    );

    return {
      inserted: entities.length,
      skipped,
      withCoords,
      withoutCoords,
    };
  }

  private toNullableNumber(n: any): number | null {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  }

  private async safeUnlink(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`🗑️ 업로드 임시 파일 삭제: ${filePath}`);
    } catch (e) {
      this.logger.warn(`임시 파일 삭제 실패(무시 가능): ${(e as Error).message}`);
    }
  }
}

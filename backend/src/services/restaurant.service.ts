//restaurant.service.ts

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
      sentiment_score: (data as any).sentiment_score ?? 0,
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
      sentiment_score: 0,
    });

    return this.restaurantRepo.save(restaurant);
  }

  async uploadCsv(filePath: string): Promise<{
    inserted: number;
    updated: number;
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
        sentiment_score: "sentiment_score",
        totalscore: "total_score",
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

            const dto: CreateRestaurantDto & {
              sentiment_score?: number;
              total_score?: number;
            } = {
              name,
              address: String(row["address"] ?? "").trim(),
              lat: normalizeNumber(row["lat"]),
              lon: normalizeNumber(row["lon"]),
              preview: row["preview"] ?? null,
              url: row["url"] ?? null,
              review: row["review"] ?? null,
              review_count: normalizeNumber(row["review_count"]),
              naver_score: normalizeNumber(row["naver_score"]),
              sentiment_score: normalizeNumber(row["sentiment_score"]),
              total_score: normalizeNumber(row["total_score"]),
              keywords: toKeywordsArray(row["keywords"]) ?? undefined,
            };

            rows.push(dto);
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
        .once("error", (err: Error) => reject(err));
    });

    let inserted = 0;
    let updated = 0;

    for (const dto of rows) {
      const existing = await this.findByName(dto.name);
      if (existing) {
        existing.address = dto.address || existing.address;
        existing.lat = this.toNullableNumber(dto.lat) ?? existing.lat;
        existing.lon = this.toNullableNumber(dto.lon) ?? existing.lon;
        existing.preview = dto.preview || existing.preview;
        existing.url = dto.url || existing.url;
        existing.keywords = dto.keywords || existing.keywords;

        // ✅ 점수 값이 0일 경우 덮어쓰지 않음
        if (dto.review_count && dto.review_count > 0) {
          existing.review_count = dto.review_count;
        }
        if (dto.naver_score && dto.naver_score > 0) {
          existing.naver_score = dto.naver_score;
        }
        if (dto.sentiment_score && dto.sentiment_score > 0) {
          existing.sentiment_score = dto.sentiment_score;
        }
        if (dto.total_score && dto.total_score > 0) {
          existing.total_score = dto.total_score;
        }

        await this.restaurantRepo.save(existing);
        updated++;
      } else {
        const newR = this.restaurantRepo.create({
          ...dto,
          lat: this.toNullableNumber(dto.lat),
          lon: this.toNullableNumber(dto.lon),
          keywords: dto.keywords ?? [],
          review_count: dto.review_count && dto.review_count > 0 ? dto.review_count : 0,
          naver_score: dto.naver_score && dto.naver_score > 0 ? dto.naver_score : 0,
          sentiment_score:
            dto.sentiment_score && dto.sentiment_score > 0 ? dto.sentiment_score : 0,
          total_score: dto.total_score && dto.total_score > 0 ? dto.total_score : 0,
        });
        await this.restaurantRepo.save(newR);
        inserted++;
      }
    }

    const withCoords = rows.filter(
      (r) => Number.isFinite(r.lat) && Number.isFinite(r.lon),
    ).length;
    const withoutCoords = rows.length - withCoords;

    await this.safeUnlink(filePath);

    this.logger.log(
      `📦 저장 완료: inserted=${inserted}, updated=${updated}, skipped=${skipped}, withCoords=${withCoords}, withoutCoords=${withoutCoords}`,
    );

    return { inserted, updated, skipped, withCoords, withoutCoords };
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

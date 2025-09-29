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
      // 저장 시 NaN 방지: 숫자가 아니면 null로
      lat: this.toNullableNumber(data.lat),
      lon: this.toNullableNumber(data.lon),
      keywords: data.keywords ?? null,
      review_count: data.review_count ?? 0,
      total_score: data.total_score ?? 0,
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

  // 파일명 등에서 레스토랑 자동 생성할 때 사용 (필요 시)
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
    });

    return this.restaurantRepo.save(restaurant);
  }

  /** CSV 파일을 읽어 일괄 insert
   * 예상 헤더(권장):
   *  name,address,lat,lon,keywords,preview,naver_score,url,review,review_count
   * - lat/lon: 십진수 (예: 35.244, 129.091)
   * - keywords: '["국밥","돼지국밥"]' 또는 '국밥, 돼지국밥'
   */
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
      // 1,234.56 또는 1,234 형태 쉼표 제거
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
      // 12,34 → 12.34 같은 유럽형 소수점
      else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
      // 숫자/부호/지수만 남김
      s = s.replace(/[^0-9.\-+eE]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    };

    const toKeywordsArray = (raw: any): string[] | null => {
      if (raw === null || raw === undefined) return null;
      const s = String(raw).trim();
      if (!s) return null;
      // JSON 배열형 시도
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        // 콤마 구분형 시도
        const parts = s
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
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

            const address = String(row["address"] ?? "").trim();

            // lat/lon → 숫자 변환 후 NaN이면 null로 처리
            const latRaw = normalizeNumber(row["lat"]);
            const lonRaw = normalizeNumber(row["lon"]);
            const lat = Number.isFinite(latRaw) ? latRaw : null;
            const lon = Number.isFinite(lonRaw) ? lonRaw : null;

            const preview =
              row["preview"] !== undefined && row["preview"] !== null
                ? String(row["preview"]).trim()
                : undefined;
            const url =
              row["url"] !== undefined && row["url"] !== null
                ? String(row["url"]).trim()
                : undefined;
            const review =
              row["review"] !== undefined && row["review"] !== null
                ? String(row["review"]).trim()
                : undefined;

            const review_countRaw = normalizeNumber(row["review_count"]);
            const naver_scoreRaw = normalizeNumber(row["naver_score"]);
            const review_count = Number.isFinite(review_countRaw) ? review_countRaw : 0;
            const naver_score = Number.isFinite(naver_scoreRaw) ? naver_scoreRaw : 0;

            const keywords = toKeywordsArray(row["keywords"]); // JSON 배열 또는 콤마 구분 지원

            rows.push({
              name,
              address,
              lat,
              lon,
              preview,
              url,
              review,
              review_count,
              total_score: 0,
              naver_score,
              keywords: keywords ?? undefined,
            } as CreateRestaurantDto);
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
        review_count: dto.review_count ?? 0,
        total_score: dto.total_score ?? 0,
        naver_score: dto.naver_score ?? 0,
        preview: dto.preview ?? null,
        url: dto.url ?? null,
        review: dto.review ?? null,
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

  // ----------------- 내부 유틸 -----------------
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

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

  // ✅ 파일명 기반 restaurant 자동 생성
  async getOrCreateRestaurantByName(name: string): Promise<Restaurant> {
    let restaurant = await this.findByName(name);
    if (restaurant) {
      return restaurant;
    }

    this.logger.warn(`⚠️ 가게 "${name}" DB에 없음 → 신규 생성`);
    restaurant = this.restaurantRepo.create({
    name,
    address: '',
    lat: null,
    lon: null,
    keywords: [],     // ✅ 빈 배열
    review_count: 0,
    total_score: 0,
  });

    return this.restaurantRepo.save(restaurant);
  }

  /** CSV 파일(헤더: name,address,lat,lon[,preview])을 읽어 일괄 insert */
  async uploadCsv(filePath: string): Promise<{ inserted: number }> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const rows: CreateRestaurantDto[] = [];

    const normalizeNumber = (value: unknown): number => {
      if (value === null || value === undefined) return NaN;
      let s = String(value).trim();
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
        s = s.replace(/,/g, "");
      } else if (/^\d+,\d+$/.test(s)) {
        s = s.replace(",", ".");
      }
      s = s.replace(/[^0-9.\-+eE]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
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
        naver_score: "naver_score",
        preview: "preview",
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
            const address = String(row["address"] ?? "").trim();
            const lat = normalizeNumber(row["lat"]);
            const lon = normalizeNumber(row["lon"]);
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
            const review_count = normalizeNumber(row["review_count"]);
            const naver_score = normalizeNumber(row["naver_score"]);

            if (!name) {
              this.logger.warn(`⚠️ 이름 누락, 스킵: ${JSON.stringify(row)}`);
              return;
            }

            rows.push({
              name,
              address,
              lat,
              lon,
              preview,
              url,
              review,
              review_count: Number.isNaN(review_count) ? 0 : review_count,
              total_score: 0,
              naver_score: Number.isNaN(naver_score) ? 0 : naver_score,
            } as CreateRestaurantDto);
          } catch (e) {
            this.logger.error(`❌ Row parse error: ${e instanceof Error ? e.message : String(e)}`);
          }
        })
        .once("end", () => {
          this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row`);
          resolve();
        })
        .once("error", (err: Error) => {
          this.logger.error(`❌ CSV Parse Error: ${err.message}`);
          reject(err);
        });
    });

    if (rows.length === 0) {
      this.logger.warn("⚠️ 유효한 row가 없어 저장하지 않습니다.");
      return { inserted: 0 };
    }

    const entities = rows.map((dto) =>
      this.restaurantRepo.create({
        ...dto,
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

    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`🗑️ 업로드 임시 파일 삭제: ${filePath}`);
    } catch (e) {
      this.logger.warn(`임시 파일 삭제 실패(무시 가능): ${(e as Error).message}`);
    }

    return { inserted: rows.length };
  }
}

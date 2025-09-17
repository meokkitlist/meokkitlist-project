import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Restaurant } from "../entities/restaurant.entity";
import { CreateRestaurantDto } from "../dto/create-restaurant.dto";
import * as fs from "fs";
import * as csv from "csv-parser"; // ✅ 여기 수정

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
        아이디: "id",
        name: "name",
        이름: "name",
        storename: "name",
        storeName: "name",
        address: "address",
        주소: "address",
        storeaddress: "address",
        url: "url",
        링크: "url",
        lat: "lat",
        latitude: "lat",
        위도: "lat",
        lat위도: "lat",
        lon: "lon",
        lng: "lon",
        longitude: "lon",
        경도: "lon",
        lon경도: "lon",
        review: "review",
        리뷰: "review",
        review_count: "review_count",
        리뷰수: "review_count",
        naver_score: "naver_score",
        네이버점수: "naver_score",
        preview: "preview",
        미리보기: "preview",
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
            this.logger.debug(`📌 CSV Row(raw): ${JSON.stringify(row)}`);

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
            if (!address) {
              this.logger.warn(`⚠️ 주소 누락, 스킵: ${JSON.stringify(row)}`);
              return;
            }
            if (Number.isNaN(lat)) {
              this.logger.warn(`⚠️ 위도 누락/형식오류, 스킵: ${JSON.stringify(row)}`);
              return;
            }
            if (Number.isNaN(lon)) {
              this.logger.warn(`⚠️ 경도 누락/형식오류, 스킵: ${JSON.stringify(row)}`);
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

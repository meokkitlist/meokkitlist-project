import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { CreateRestaurantDto } from '../dto/create-restaurant.dto';
import * as fs from 'fs';
import * as csv from 'csv-parser';

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
    });
    return this.restaurantRepo.save(restaurant);
  }

  /** CSV 파일(헤더: name,address,lat,lon[,preview])을 읽어 일괄 insert */
  async uploadCsv(filePath: string): Promise<{ inserted: number }> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const rows: CreateRestaurantDto[] = [];

    // ── 숫자 문자열을 안전하게 number로 변환
    const normalizeNumber = (value: unknown): number => {
      if (value === null || value === undefined) return NaN;
      let s = String(value).trim();

      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
        s = s.replace(/,/g, ''); // "1,234.56" → "1234.56"
      } else if (/^\d+,\d+$/.test(s)) {
        s = s.replace(',', '.'); // "12,34" → "12.34"
      }

      s = s.replace(/[^0-9.\-+eE]/g, ''); // 숫자/소수점 외 제거
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    };

    // ── 헤더 정규화
    const normalizeHeader = (header: string): string => {
      const h = header
        .replace(/\uFEFF/g, '')
        .normalize('NFKC')
        .trim()
        .replace(/\s+/g, '')
        .replace(/[(){}\[\]\-]/g, '')
        .toLowerCase();

      const aliasMap: Record<string, string> = {
        name: 'name',
        이름: 'name',
        storename: 'name',

        address: 'address',
        주소: 'address',
        storeaddress: 'address',

        lat: 'lat',
        latitude: 'lat',
        위도: 'lat',
        lat위도: 'lat',

        lon: 'lon',
        lng: 'lon',
        longitude: 'lon',
        경도: 'lon',
        lon경도: 'lon',

        preview: 'preview',
        미리보기: 'preview',
      };

      return aliasMap[h] ?? h;
    };

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(
          csv({
            mapHeaders: ({ header }) => normalizeHeader(header),
            mapValues: ({ value }) =>
              typeof value === 'string' ? value.trim() : value,
          }),
        )
        .on('data', (row: any) => {
          try {
            this.logger.debug(`📌 CSV Row(raw): ${JSON.stringify(row)}`);

            const nameRaw = row['name'] ?? '';
            const addressRaw = row['address'] ?? '';
            const latRaw = row['lat'];
            const lonRaw = row['lon'];
            const previewRaw = row['preview'];

            const name = String(nameRaw || '').trim();
            const address = String(addressRaw || '').trim();
            const lat = normalizeNumber(latRaw);
            const lon = normalizeNumber(lonRaw);
            const preview =
              previewRaw !== undefined && previewRaw !== null
                ? String(previewRaw).trim()
                : undefined;

            this.logger.debug(
              `   - Parsed → name: "${name}", address: "${address}", lat: ${lat}, lon: ${lon}`,
            );

            // 최소 유효성 검사 (이름/주소만 필수)
            if (!name) {
              this.logger.warn(`⚠️ 이름 누락, 스킵: ${JSON.stringify(row)}`);
              return;
            }
            if (!address) {
              this.logger.warn(`⚠️ 주소 누락, 스킵: ${JSON.stringify(row)}`);
              return;
            }

            // lat/lon → 누락 시 null 저장
            const latFinal = Number.isNaN(lat) ? null : lat;
            const lonFinal = Number.isNaN(lon) ? null : lon;

            if (latFinal === null) {
              this.logger.warn(`⚠️ 위도 누락/형식오류 → null 처리`);
            }
            if (lonFinal === null) {
              this.logger.warn(`⚠️ 경도 누락/형식오류 → null 처리`);
            }

            rows.push({
              name,
              address,
              lat: latFinal,
              lon: lonFinal,
              preview,
              review_count: 0,
              total_score: 0,
              naver_score: 0,
            });
          } catch (e) {
            this.logger.error(
              `❌ Row parse error: ${
                e instanceof Error ? e.message : String(e)
              }`,
            );
          }
        })
        .once('end', () => {
          this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row`);
          resolve();
        })
        .once('error', (err: Error) => {
          this.logger.error(`❌ CSV Parse Error: ${err.message}`);
          reject(err);
        });
    });

    if (rows.length === 0) {
      this.logger.warn('⚠️ 유효한 row가 없어 저장하지 않습니다.');
      return { inserted: 0 };
    }

    const entities = rows.map((dto) => this.restaurantRepo.create(dto));
    await this.restaurantRepo.save(entities);

    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`🗑️ 업로드 임시 파일 삭제: ${filePath}`);
    } catch (e) {
      this.logger.warn(
        `임시 파일 삭제 실패(무시 가능): ${(e as Error).message}`,
      );
    }

    return { inserted: rows.length };
  }
}

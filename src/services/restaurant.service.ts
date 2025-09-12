// src/services/restaurant.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { CreateRestaurantDto } from '../dto/create-restaurant.dto';
import * as fs from 'fs';
import csv from 'csv-parser';

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
    const rows: CreateRestaurantDto[] = [];

    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const normalizeNumber = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const s = String(v).trim().replace(/['"]/g, '');
      const fixed = s.replace(',', '.');
      const parsed = parseFloat(fixed);
      return isNaN(parsed) ? null : parsed;
    };

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            this.logger.debug(`📌 CSV Row: ${JSON.stringify(row)}`);

            const name =
              row.name ||
              row.Name ||
              row['이름'] ||
              row['store_name'] ||
              '';
            const address =
              row.address ||
              row.Address ||
              row['주소'] ||
              row['store_address'] ||
              '';
            const lat = normalizeNumber(
              row.lat ||
                row.latitude ||
                row.Lat ||
                row['위도'] ||
                row['lat(위도)'],
            );
            const lon = normalizeNumber(
              row.lon ||
                row.lng ||
                row.Lon ||
                row.longitude ||
                row['경도'] ||
                row['lon(경도)'],
            );
            const preview =
              row.preview || row.Preview || row['미리보기'] || undefined;

            if (!name || !address) {
              this.logger.warn(
                `⚠️ Skip row (필수값 누락): ${JSON.stringify(row)}`,
              );
              return;
            }

            rows.push({
              name: String(name).trim(),
              address: String(address).trim(),
              lat,
              lon,
              preview: preview ? String(preview).trim() : undefined,
              review_count: 0,
              total_score: 0,
              naver_score: 0,
            });
          } catch (e) {
            this.logger.error(`❌ Row parse error: ${e}`);
          }
        })
        .on('end', () => {
          this.logger.log(`✅ CSV 파싱 완료: ${rows.length}개 유효 row`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`❌ CSV Parse Error: ${err.message}`);
          reject(err);
        });
    });

    if (rows.length === 0) {
      this.logger.warn('⚠️ 유효한 row가 없어 저장하지 않음');
      return { inserted: 0 };
    }

    await this.restaurantRepo.save(rows);

    // 업로드 임시 파일 삭제
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      this.logger.warn(`⚠️ 임시 파일 삭제 실패: ${e.message}`);
    }

    return { inserted: rows.length };
  }
}

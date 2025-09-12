import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RestaurantService } from '../services/restaurant.service';

// 업로드 디렉토리 지정
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'csv');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@ApiTags('Restaurant') // Swagger 그룹 이름
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {
    ensureDir(UPLOAD_DIR);
  }

  @Post('upload-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(UPLOAD_DIR);
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const ext = path.extname(file.originalname) || '.csv';
          cb(null, `restaurant_${ts}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'text/csv' ||
          file.originalname.toLowerCase().endsWith('.csv');
        cb(
          ok ? null : new BadRequestException('CSV 파일만 업로드 가능합니다.'),
          ok,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data') // Swagger에 파일 업로드 표시
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path) {
      throw new BadRequestException('파일 업로드 실패');
    }
    const { inserted } = await this.restaurantService.uploadCsv(file.path);
    return { inserted };
  }
}

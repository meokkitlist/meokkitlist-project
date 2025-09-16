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
import {
  ApiBody,
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RestaurantService } from '../services/restaurant.service';

// ✅ 타입 직접 정의
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
};

// 업로드 디렉토리 지정
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'csv');

function ensureDir(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    throw new Error(`업로드 디렉토리 생성 실패: ${(e as Error).message}`);
  }
}

@ApiTags('Restaurant')
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
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.toLowerCase().endsWith('.csv');
        cb(
          ok ? null : new BadRequestException('CSV 파일만 업로드 가능합니다.'),
          ok,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOperation({ summary: 'CSV 업로드 (레스토랑 배치 저장)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '레스토랑 CSV 업로드 (헤더: name, address, lat, lon, preview)',
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
  @ApiOkResponse({
    description: 'CSV 업로드 결과',
    schema: {
      type: 'object',
      properties: {
        inserted: { type: 'number', example: 5 },
      },
    },
  })
  async uploadCsv(@UploadedFile() file: MulterFile) {
    if (!file?.path) {
      throw new BadRequestException('파일 업로드 실패');
    }
    const { inserted } = await this.restaurantService.uploadCsv(file.path);
    return { inserted };
  }
}

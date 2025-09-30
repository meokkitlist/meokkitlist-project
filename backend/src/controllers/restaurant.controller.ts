import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RestaurantService } from "../services/restaurant.service";
import { Express } from "express";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "csv");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@ApiTags("Restaurant")
@Controller("restaurant")
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {
    ensureDir(UPLOAD_DIR);
  }

  @Post("upload-csv")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(UPLOAD_DIR);
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const parsed = path.parse(file.originalname);
          const safeBase =
            parsed.name.normalize("NFKC").replace(/[^\w가-힣.\-_/]/g, "_") ||
            "restaurants";
          const ext = parsed.ext?.toLowerCase() === ".csv" ? ".csv" : ".csv";
          cb(null, `restaurant_${ts}_${safeBase}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === "text/csv" ||
          file.originalname.toLowerCase().endsWith(".csv");
        cb(
          ok ? null : new BadRequestException("CSV 파일만 업로드 가능합니다."),
          ok,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path) {
      throw new BadRequestException("파일 업로드 실패");
    }
    return this.restaurantService.uploadCsv(file.path);
  }
}

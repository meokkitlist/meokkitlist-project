import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtCookieGuard } from "../auth/jwt-cookie.guard";
import { ReviewService } from "../services/review.service";

@Controller("review")
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);

  constructor(private readonly reviewService: ReviewService) {}

  /**
   * CSV 업로드 엔드포인트
   * - 인증된 사용자만 가능 (JwtCookieGuard)
   * - multipart/form-data 업로드
   */
  @Post("upload-csv")
  @UseGuards(JwtCookieGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`📂 업로드된 파일: ${file?.originalname}`);
    return this.reviewService.uploadCsv(file);
  }
}

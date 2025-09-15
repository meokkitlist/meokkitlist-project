import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { KakaoService } from './kakao.service';
import { SearchKakaoDto } from './dto/search.dto';

@Controller('search')
export class KakaoController {
  constructor(private readonly kakaoService: KakaoService) {}

  @Get()
  async searchPlaces(@Query() query: SearchKakaoDto) {
    const { query: keyword, lat, lng, radius } = query;
    return this.kakaoService.searchPlaces(keyword, lat, lng, radius);
  }

  // ✅ 감성 분석용 POST 라우트 추가
  @Post('/analyze-review')
  async analyzeReview(@Body('text') text: string) {
    return this.kakaoService.analyzeSentiment(text);
  }
}

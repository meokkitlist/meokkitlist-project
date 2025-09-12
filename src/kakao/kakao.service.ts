import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class KakaoService {
  private readonly kakaoKey = process.env.KAKAO_REST_KEY;

  async searchPlaces(query: string, lat: number, lng: number, radius: number) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json`;

    const response = await axios.get(url, {
      params: {
        query,
        x: lng,
        y: lat,
        radius,
        sort: 'distance',
      },
      headers: {
        Authorization: `KakaoAK ${this.kakaoKey}`,
      },
    });

    return response.data.documents.map((place: any) => ({
      name: place.place_name,
      address: place.address_name,
      category: place.category_name,
      phone: place.phone,
      x: place.x,
      y: place.y,
      url: place.place_url,
    }));
  }

  // ✅ 감성 분석 더미 함수
  async analyzeSentiment(text: string): Promise<{ sentiment: string; score: number }> {
    console.log('📩 분석할 텍스트:', text);

    const lower = text.toLowerCase();
    const negativeWords = ['별로', '불친절', '최악', '지저분'];
    const isNegative = negativeWords.some(word => lower.includes(word));

    return {
      sentiment: isNegative ? 'negative' : 'positive',
      score: isNegative ? 0.2 : 0.92,
    };
  }
}

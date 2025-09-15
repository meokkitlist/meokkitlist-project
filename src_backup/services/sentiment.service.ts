import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

// ✅ 분석 결과 타입
export interface SentimentResult {
  sentiment: string;         // 예: "Positive"
  score: number;             // 예: 78
  emoji: string;             // 예: 😊
  percent: number;           // 예: 78
  raw: {
    top_label: string;
    top_prob: number;
    keywords?: string[];     // ✅ 키워드 포함 (FastAPI 응답에서 받을 경우)
    ui?: {
      emoji: string;
      percent: number;
    };
  };
}

@Injectable()
export class SentimentService {
  constructor(private readonly httpService: HttpService) {}

  // ✅ 감성 분석 요청
  async analyze(
    text: string,
    restaurantId: string,
    source: 'user' | 'crawl',
    userId?: string,
  ): Promise<SentimentResult> {
    try {
      const response = await this.httpService.axiosRef.post(
        'http://localhost:8001/analyze',
        {
          text,
          restaurant_id: restaurantId,
          source,
          user_id: userId,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const data = response.data;

      if (!data?.top_label || typeof data.top_prob !== 'number') {
        throw new Error('FastAPI 감성 분석 결과가 올바르지 않습니다.');
      }

      // ✅ 라벨-점수 매핑
      const labelToBaseScore: Record<string, { sentiment: string; base: number }> = {
        very_neg: { sentiment: 'Very Negative', base: 10 },
        neg: { sentiment: 'Negative', base: 30 },
        neu: { sentiment: 'Neutral', base: 50 },
        pos: { sentiment: 'Positive', base: 70 },
        very_pos: { sentiment: 'Very Positive', base: 90 },
      };

      const mapped = labelToBaseScore[data.top_label] ?? {
        sentiment: 'Unknown',
        base: 50,
      };

      const adjustedScore = Math.round(mapped.base * data.top_prob);
      const percent = data.ui?.percent ?? Math.round(data.top_prob * 100);
      const emoji = data.ui?.emoji ?? '❓';

      return {
        sentiment: mapped.sentiment,
        score: Math.min(100, Math.max(0, adjustedScore)),
        percent,
        emoji,
        raw: data,
      };
    } catch (error: any) {
      console.error('❌ 감성 분석 실패:', error?.message || error);
      return {
        sentiment: 'error',
        score: 0,
        emoji: '❌',
        percent: 0,
        raw: {
          top_label: 'error',
          top_prob: 0,
        },
      };
    }
  }

  // ✅ 키워드 확장 (선택 기능)
  async expandKeywords(keyword: string): Promise<string[]> {
    try {
      const response = await this.httpService.axiosRef.post(
        'http://localhost:8001/expand_keywords',
        { keyword },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const keywords = response.data?.keywords;

      if (!Array.isArray(keywords)) {
        throw new Error('FastAPI로부터 키워드 배열을 받지 못했습니다.');
      }

      return keywords;
    } catch (error: any) {
      console.error('❌ 키워드 확장 실패:', error?.message || error);
      return [keyword]; // fallback: 단일 키워드로
    }
  }
}

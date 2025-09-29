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
    keywords?: string[];
    ui?: {
      emoji: string;
      percent: number;
    };
  };
}

@Injectable()
export class SentimentService {
  constructor(private readonly httpService: HttpService) {}

  private get apiUrl(): string {
    return process.env.SENTIMENT_API_URL ?? 'http://localhost:8001';
  }

  // ✅ 감성 분석 요청
  async analyze(
    text: string,
    restaurantId: string,
    source: 'user' | 'crawl',
    userId?: string,
  ): Promise<SentimentResult> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.apiUrl}/analyze`,
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

      // ✅ 라벨-점수 매핑 (확장: 감정 레이블 대응)
      const labelToBaseScore: Record<string, { sentiment: string; base: number }> = {
    // 긍정 계열
    '기쁨(행복한)': { sentiment: 'Positive', base: 80 },
    '즐거운(신나는)': { sentiment: 'Positive', base: 75 },

    // 부정 계열
    '짜증남': { sentiment: 'Negative', base: 30 },
    '슬픔(우울한)': { sentiment: 'Negative', base: 25 },

    // 중립/애매
    '일상적인': { sentiment: 'Neutral', base: 50 },
    '생각이 많은': { sentiment: 'Neutral', base: 55 },

    // Fallback
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

      // ✅ 최종 점수 = base × 확률
      const adjustedScore = Math.round(mapped.base * data.top_prob);

      // ✅ UI는 "보여주기 용도"만 활용 (DB 점수에는 영향 X)
      const percent = Math.round(data.top_prob * 100);
      const emoji = data.ui?.emoji ?? this.getEmojiFromSentiment(mapped.sentiment);

      return {
        sentiment: mapped.sentiment,
        score: Math.min(100, Math.max(0, adjustedScore)), // 0~100 클램핑
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

  // ✅ 간단 이모지 매퍼
  private getEmojiFromSentiment(sentiment: string): string {
    switch (sentiment) {
      case 'Very Positive':
      case 'Joy':
        return '😄';
      case 'Positive':
        return '😊';
      case 'Neutral':
        return '😐';
      case 'Negative':
      case 'Sadness':
        return '☹️';
      case 'Very Negative':
      case 'Anger':
        return '😡';
      case 'Surprise':
        return '😲';
      default:
        return '❓';
    }
  }

  // ✅ 키워드 확장
  async expandKeywords(keyword: string): Promise<string[]> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.apiUrl}/expand_keywords`,
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
      return [keyword];
    }
  }
}

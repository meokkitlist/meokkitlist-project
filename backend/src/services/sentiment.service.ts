import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

// ✅ 분석 결과 타입
export interface SentimentResult {
  sentiment: string; // 예: "Positive"
  score: number;     // 예: 78
  emoji: string;     // 예: 😊
  percent: number;   // 예: 78
  raw: any;          // 전체 원본 응답 저장
}

@Injectable()
export class SentimentService {
  constructor(private readonly httpService: HttpService) {}

  private get apiUrl(): string {
    return process.env.SENTIMENT_API_URL ?? 'http://localhost:8001';
  }

  // ✅ 라벨-점수 매핑 (확률 가중합 기반 계산용)
  private readonly labelToBaseScore: Record<string, { sentiment: string; base: number }> = {
    // 긍정 계열
    '기쁨(행복한)': { sentiment: 'Positive', base: 80 },
    '고마운': { sentiment: 'Positive', base: 70 },
    '즐거운(신나는)': { sentiment: 'Positive', base: 75 },
    '설레는(기대하는)': { sentiment: 'Positive', base: 85 },
    '사랑하는': { sentiment: 'Positive', base: 90 },

    // 부정 계열
    '짜증남': { sentiment: 'Negative', base: 30 },
    '슬픔(우울한)': { sentiment: 'Negative', base: 25 },
    '걱정스러운(불안한)': { sentiment: 'Negative', base: 35 },

    // 중립/애매
    '일상적인': { sentiment: 'Neutral', base: 50 },
    '생각이 많은': { sentiment: 'Neutral', base: 55 },

    // 영어 fallback (감성서버 영문 라벨 들어올 때)
    Positive: { sentiment: 'Positive', base: 70 },

    // Fallback (분포 계산용 기본 축)
    very_neg: { sentiment: 'Very Negative', base: 0 },
    neg: { sentiment: 'Negative', base: 25 },
    neu: { sentiment: 'Neutral', base: 50 },
    pos: { sentiment: 'Positive', base: 75 },
    very_pos: { sentiment: 'Very Positive', base: 100 },
  };

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
        { headers: { 'Content-Type': 'application/json' } },
      );

      const data = response.data;

      // ✅ 확률 분포 기반 점수 계산
      let score = 0;
      if (data?.probs && typeof data.probs === 'object') {
        // probs 전체 가중합 계산
        for (const [label, prob] of Object.entries<number>(data.probs)) {
          const mapped = this.labelToBaseScore[label] ?? { sentiment: 'Neutral', base: 50 };
          score += prob * mapped.base;
        }
        score = Math.round(score);
      } else if (data?.top_label && typeof data.top_prob === 'number') {
        // fallback: top_label만 있을 때 기존 방식
        const mapped = this.labelToBaseScore[data.top_label] ?? { sentiment: 'Neutral', base: 50 };
        score = Math.round(mapped.base * data.top_prob);
      } else {
        throw new Error('FastAPI 감성 분석 결과가 올바르지 않습니다.');
      }

      // ✅ 대표 라벨 (top_label 그대로 보여줌)
      const topLabel = data.top_label ?? 'Unknown';
      const mapped = this.labelToBaseScore[topLabel] ?? { sentiment: 'Unknown', base: 50 };

      // ✅ UI
      const percent = data.ui?.percent ?? Math.round(data.top_prob * 100) ?? 0;
      const emoji = data.ui?.emoji ?? this.getEmojiFromSentiment(mapped.sentiment);

      return {
        sentiment: topLabel,
        score: Math.min(100, Math.max(0, score)), // 0~100 클램핑
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
        raw: { error: true },
      };
    }
  }

  // ✅ 간단 이모지 매퍼
  private getEmojiFromSentiment(sentiment: string): string {
    switch (sentiment) {
      case 'Very Positive':
      case 'Joy':
      case '기쁨(행복한)':
      case '즐거운(신나는)':
      case '고마운':
      case '설레는(기대하는)':
      case '사랑하는':
        return '😄';
      case 'Positive':
        return '😊';
      case 'Neutral':
      case '일상적인':
      case '생각이 많은':
        return '😐';
      case 'Negative':
      case '슬픔(우울한)':
      case '짜증남':
      case '걱정스러운(불안한)':
        return '☹️';
      case 'Very Negative':
        return '😡';
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
        { headers: { 'Content-Type': 'application/json' } },
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

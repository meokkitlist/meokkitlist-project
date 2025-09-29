import type { RankingItem } from '@/types/ranking'

export type KeywordSearchRequest = {
  keyword: string
  userPosition: { lat: number; lon: number }
  range: number // km
}

export const KEYWORD_SEARCH_MOCK_RESPONSE = {
  meta: {
    query: {
      keyword: '날씨는 맑음',
      userPosition: { lat: 35.858, lon: 128.621 },
      range: 0.5,
    },
  },
  data: [
    {
      rank: 1,
      marketName: '부산밀면',
      marketAddress: '부산광역시 금정구 금정동',
      marketUrl: 'https://map.kakao.com/link/to/부산밀면,35.85794,128.618487',
      relatedKeyword: ['날씨', '맑음', '더움', '시원함'],
      reviewCount: 999,
      reviewPreview: '밀면이 시원하이 참 좋네용',
      totalScore: 3.7,
      finalScore: 1200,
      naverScore: 4.6,
      coordinates: { lat: 35.85794, lon: 128.618487 },
    },
    {
      rank: 2,
      marketName: '해운대 냉면골목',
      marketAddress: '부산광역시 해운대구 우동',
      marketUrl:
        'https://map.kakao.com/link/to/해운대 냉면골목,35.85978,128.624851',
      relatedKeyword: ['맑음', '시원함', '여름'],
      reviewCount: 532,
      reviewPreview: '국물 시원, 곱배기 강추',
      totalScore: 4.2,
      finalScore: 1000,
      naverScore: 4.4,
      coordinates: { lat: 35.85978, lon: 128.624851 },
    },
    {
      rank: 3,
      marketName: '광안리밀면',
      marketAddress: '부산광역시 수영구 광안동',
      marketUrl:
        'https://map.kakao.com/link/to/광안리밀면,35.856434,128.619956',
      relatedKeyword: ['맑음', '바다', '시원함'],
      reviewCount: 281,
      reviewPreview: '뷰 + 밀면 = 행복',
      totalScore: 4.0,
      finalScore: 900,
      naverScore: 4.2,
      coordinates: { lat: 35.856434, lon: 128.619956 },
    },
    {
      rank: 4,
      marketName: '온천장냉면',
      marketAddress: '부산광역시 동래구 온천동',
      marketUrl:
        'https://map.kakao.com/link/to/온천장냉면,35.858471,128.623086',
      relatedKeyword: ['더움', '시원함'],
      reviewCount: 143,
      reviewPreview: '면발 탱탱, 물냉 강추',
      totalScore: 3.9,
      finalScore: 800,
      naverScore: 4.1,
      coordinates: { lat: 35.858471, lon: 128.623086 },
    },
    {
      rank: 5,
      marketName: '서면밀면',
      marketAddress: '부산광역시 부산진구 부전동',
      marketUrl: 'https://map.kakao.com/link/to/서면밀면,35.856519,128.618487',
      relatedKeyword: ['맑음', '점심', '시원함'],
      reviewCount: 874,
      reviewPreview: '줄 길어도 금방 빠져요',
      totalScore: 4.3,
      finalScore: 700,
      naverScore: 4.5,
      coordinates: { lat: 35.856519, lon: 128.618487 },
    },
  ],
}

export async function mockKeywordSearch(
  body: KeywordSearchRequest
): Promise<RankingItem[]> {
  console.log('[mock] keyword search request:', body)
  // 지연 시뮬레이션(선택)
  await new Promise((r) => setTimeout(r, 300))
  return KEYWORD_SEARCH_MOCK_RESPONSE.data
}

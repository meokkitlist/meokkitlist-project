export type RankingItem = {
  rank: number
  marketName: string
  marketAddress: string
  marketUrl: string
  relatedKeyword: string[]
  reviewCount: number
  reviewPreview: string
  totalScore: number
  naverScore: number
  coordinates: { lat: number; lon: number }
}

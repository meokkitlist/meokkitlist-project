export type RankingItem = {
  rank: number
  restaurant_id?: number
  marketName: string
  marketAddress: string
  marketUrl: string | null
  relatedKeyword: string[]
  keywordsMatched?: string[]
  matchScore?: number
  totalScore: number
  reviewCount: number
  sentimentScore?: number
  finalScore: number
  naverScore: number | null
  coordinates: { lat: number | null; lon: number | null }
  distanceKm?: number | null
  preview?: string
}

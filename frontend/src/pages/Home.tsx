import { Layout } from '@/components/Layout/Layout'
import { KakaoMap } from '@/components/Map/KakaoMap'
import { TopBar } from '@/components/TopBar/TopBar'
import { RankingSection } from '@/components/Ranking/RankingSection'
import { useEffect, useState } from 'react'
import type { RankingItem } from '@/types/ranking'
import { searchPlacesByKeyword } from '@/api/search'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const urlJoin = (path: string) => new URL(path, API_BASE_URL).toString()

export function Home() {
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lon: number
  } | null>(null)
  const [searchState, setSearchState] = useState<{
    query: string
    radius: number
  } | null>(null)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const handleSyncLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation을 지원하지 않는 브라우저입니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      (error) => {
        console.error('위치 정보를 가져올 수 없습니다.', error)
      }
    )
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(urlJoin('/auth/me'), { credentials: 'include' })
        if (!res.ok) return // 비로그인(401) 등은 무시
        const data = await res.json() // { email: string }
        const id = String(data?.email || '').split('@')[0] || null
        if (mounted) setUserId(id)
      } catch {
        // 네트워크 오류 등 무시
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleLogout() {
    try {
      const res = await fetch(urlJoin('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('로그아웃 실패')
      setUserId(null)
    } catch (e) {
      console.error(e)
      alert('로그아웃 중 문제가 발생했습니다.')
    }
  }

  useEffect(() => {
    handleSyncLocation()
  }, [])

  const handleSearch = async (query: string, radiusMeters: number) => {
    setSearchState({ query, radius: radiusMeters })

    const pos = userLocation ?? { lat: 35.1796, lon: 129.0756 } // 폴백(부산)
    const reqBody = {
      keyword: query,
      userPosition: pos,
      range: Math.max(0.1, Number((radiusMeters / 1000).toFixed(2))), // m→km
    }

    try {
      setLoading(true)
      const data = await searchPlacesByKeyword(reqBody)
      setRanking((data as RankingItem[]).slice(0, 5))
    } catch (e) {
      console.error('검색 실패:', e)
      setRanking([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <TopBar
        userId={userId}
        userLocation={userLocation}
        onSyncLocation={handleSyncLocation}
        onSearch={handleSearch}
        onLogout={handleLogout}
      />
      <KakaoMap
        userLocation={userLocation}
        searchQuery={searchState?.query ?? ''}
        searchRadius={searchState?.radius ?? 500}
        rankingItems={ranking}
      />
      <RankingSection
        items={ranking}
        loading={loading}
        keyword={searchState?.query}
        userId={userId}
      />
    </Layout>
  )
}

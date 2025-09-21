import styled from '@emotion/styled'
import { useEffect, useRef } from 'react'
import type { RankingItem } from '@/types/ranking'

declare global {
  interface Window {
    kakao: any
  }
}

interface KakaoMapProps {
  userLocation: { lat: number; lon: number } | null
  searchQuery: string
  searchRadius: number
  rankingItems?: RankingItem[]
}

const APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string

// SDK 1회 로더
let sdkLoading: Promise<void> | null = null
function loadKakaoSDK() {
  if (window.kakao?.maps) return Promise.resolve()
  if (sdkLoading) return sdkLoading
  sdkLoading = new Promise<void>((resolve, reject) => {
    const id = 'kakao-sdk'
    const exist = document.getElementById(id) as HTMLScriptElement | null
    const onReady = () => window.kakao.maps.load(() => resolve())

    if (exist) {
      if (window.kakao?.maps) return resolve()
      exist.addEventListener('load', onReady, { once: true })
      exist.addEventListener(
        'error',
        () => reject(new Error('Kakao SDK load error')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}&autoload=false&libraries=services`
    script.onload = onReady
    script.onerror = () => reject(new Error('Kakao SDK load error'))
    document.head.appendChild(script)
  })
  return sdkLoading
}

export function KakaoMap({
  userLocation,
  searchQuery,
  searchRadius,
  rankingItems = [],
}: KakaoMapProps) {
  const mapRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([]) // 검색 결과 마커들
  const infoWindowRef = useRef<any>(null) // 공용 인포윈도우

  // 1) 지도 초기화 (1회)
  useEffect(() => {
    let cancelled = false
    loadKakaoSDK()
      .then(() => {
        if (cancelled) return
        const container = document.getElementById('map')
        if (!container) return
        const kakao = window.kakao
        mapRef.current = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 3,
        })
        infoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 2 })
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [])

  // 2) 사용자 위치 반영 (센터 이동 + 내 위치 마커)
  useEffect(() => {
    if (!mapRef.current || !userLocation || !window.kakao) return
    const kakao = window.kakao
    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lon)

    if (!userMarkerRef.current) {
      userMarkerRef.current = new kakao.maps.Marker({ position: pos })
    } else {
      userMarkerRef.current.setPosition(pos)
    }

    // 검색 결과가 있으면 현재 위치 마커 숨김, 없으면 표시
    if (rankingItems && rankingItems.length > 0) {
      userMarkerRef.current.setMap(null)
    } else {
      userMarkerRef.current.setMap(mapRef.current)
    }
    mapRef.current.setCenter(pos)
  }, [userLocation, rankingItems])

  // 3) RankingItems 마커 표시
  useEffect(() => {
    if (!mapRef.current || !window.kakao) return
    const kakao = window.kakao

    // 기존 마커/창 정리
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoWindowRef.current?.close()

    // 결과가 있으면 현재 위치 마커 숨김, 없으면 다시 표시
    if (rankingItems && rankingItems.length > 0) {
      userMarkerRef.current?.setMap(null)
    } else {
      userMarkerRef.current?.setMap(mapRef.current)
    }

    // RankingItems 기반 마커
    if (rankingItems && rankingItems.length > 0) {
      const bounds = new kakao.maps.LatLngBounds()

      rankingItems.forEach((p) => {
        // 좌표 유효성 검사
        if (
          !Number.isFinite(p.coordinates?.lat) ||
          !Number.isFinite(p.coordinates?.lon)
        )
          return
        const position = new kakao.maps.LatLng(
          p.coordinates.lat,
          p.coordinates.lon
        )
        const marker = new kakao.maps.Marker({
          position,
          title: `${p.rank}위 ${p.marketName}`,
        })
        marker.setMap(mapRef.current)
        markersRef.current.push(marker)
        bounds.extend(position)

        kakao.maps.event.addListener(marker, 'click', () => {
          if (!infoWindowRef.current) return
          const content = `
        <div style="padding:8px;min-width:200px;">
          <div style="font-weight:600;margin-bottom:4px;">${p.rank}위 · ${p.marketName}</div>
          <div style="font-size:12px;color:#555;">${p.marketAddress}</div>
        </div>`
          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open(mapRef.current, marker)
        })
      })

      if (!bounds.isEmpty()) {
        mapRef.current.setBounds(bounds)
      }
      return
    }

    // places가 없을 때 기존 키워드 검색
    /*
    const q = (searchQuery || '').trim()
    if (!q) return

    if (!kakao.maps.services?.Places) {
      console.error(
        'Kakao Places service not available. (libraries=services 필요)'
      )
      return
    }

    const places = new kakao.maps.services.Places()
    const center = userLocation
      ? new kakao.maps.LatLng(userLocation.lat, userLocation.lon)
      : mapRef.current.getCenter()

    const options: any = {
      location: center,
      radius: Number.isFinite(searchRadius) ? searchRadius : 500, // 미터
    }

    const keyword = `${q}`
    places.keywordSearch(
      keyword,
      (data: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK) {
          console.warn('검색 결과 없음/오류:', status)
          return
        }

        const bounds = new kakao.maps.LatLngBounds()
        if (center) bounds.extend(center)

        data.forEach((place) => {
          const position = new kakao.maps.LatLng(
            Number(place.y),
            Number(place.x)
          )
          const marker = new kakao.maps.Marker({ position })
          marker.setMap(mapRef.current)
          markersRef.current.push(marker)
          bounds.extend(position)

          kakao.maps.event.addListener(marker, 'click', () => {
            if (!infoWindowRef.current) return
            const content = `
              <div style="padding:8px;min-width:180px;">
                <div style="font-weight:600;margin-bottom:4px;">${place.place_name}</div>
                <div style="font-size:12px;color:#555;">${place.road_address_name || place.address_name || ''}</div>
                <a href="${place.place_url}" target="_blank" style="display:inline-block;margin-top:6px;font-size:12px;text-decoration:underline;">
                  상세 보기
                </a>
              </div>`
            infoWindowRef.current.setContent(content)
            infoWindowRef.current.open(mapRef.current, marker)
          })
        })

        // 결과에 맞게 화면 이동
        if (!bounds.isEmpty()) {
          mapRef.current.setBounds(bounds)
        } else {
          mapRef.current.setLevel(3)
          mapRef.current.setCenter(center)
        }
      },
      options
    )
    */
  }, [rankingItems, searchQuery, searchRadius, userLocation])

  return (
    <Wrapper>
      <MapArea id="map" />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`

const MapArea = styled.div`
  width: 100%;
  height: 300px;
  background-color: #d0d0d0;
  border-radius: 10px;
`

import styled from '@emotion/styled'
import { IconImg } from '@/components/common/IconImg'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  userId?: string | null
  userLocation: { lat: number; lon: number } | null
  onSyncLocation: () => void
  onSearch: (query: string, radius: number) => void
  onLogout?: () => void | Promise<void>
}

type Weather = {
  city: string
  temp: number
  main: string
  desc: string
}

export function TopBar({
  userId,
  userLocation,
  onSyncLocation,
  onSearch,
  onLogout,
}: TopBarProps) {
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(500)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = () => {
    if (!query.trim()) return
    onSearch(query.trim(), radius)
  }
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const emoji = useMemo(() => {
    if (!weather) return '📍'
    const m = weather.main.toLowerCase()
    if (m.includes('thunder')) return '⛈️'
    if (m.includes('drizzle')) return '🌦️'
    if (m.includes('rain')) return '🌧️'
    if (m.includes('snow')) return '❄️'
    if (m.includes('clear')) return '☀️'
    if (m.includes('cloud')) return '☁️'
    if (m.includes('mist') || m.includes('fog') || m.includes('haze'))
      return '🌫️'
    return '🌡️'
  }, [weather])

  // Kakao 로컬 REST: 좌표 → 지역명 (행정동 우선)
  async function resolveCityNameKakao(
    lat: number,
    lon: number
  ): Promise<string> {
    const restKey = import.meta.env.VITE_KAKAO_REST_KEY as string
    if (!restKey) throw new Error('VITE_KAKAO_REST_KEY 누락')

    const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lon}&y=${lat}`
    const r = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restKey}` },
    })
    if (!r.ok) throw new Error('kakao reverse geocoding failed')

    const json = await r.json()
    const docs = Array.isArray(json.documents) ? json.documents : []
    // H(행정동) 우선 → 없으면 B(법정동)
    const dong = docs.find((d: any) => d.region_type === 'H') || docs[0]
    if (!dong) return ''

    // ex) 부산광역시 해운대구 우동 → "부산 해운대구" 로 정리
    const siDoRaw = String(dong.region_1depth_name || '') // 부산광역시 / 경상남도
    const siGunGu = String(dong.region_2depth_name || '') // 해운대구 / 양산시
    const siDo = siDoRaw.replace(/(특별시|광역시|자치시)$/, '') || siDoRaw
    return [siDo, siGunGu].filter(Boolean).join(' ')
  }

  useEffect(() => {
    // Home에서 받은 좌표가 없으면 대기 (버튼으로 동기화 유도)
    if (!userLocation) {
      setWeather(null)
      setErr('위치 동기화 필요')
      return
    }

    const owmKey = import.meta.env.VITE_OWM_KEY as string
    if (!owmKey) {
      setErr('VITE_OWM_KEY 누락')
      return
    }

    const controller = new AbortController()
    const { lat, lon } = userLocation

    const load = async () => {
      setLoading(true)
      setErr(null)
      try {
        // 1) 지역명: Kakao 기준 (OpenWeather name 사용 안 함 → 부산/양산 경계 이슈 방지)
        let city = ''
        try {
          city = await resolveCityNameKakao(lat, lon)
        } catch (e) {
          // 카카오 실패 시 좌표 문자열 폴백
          city = `${lat.toFixed(3)}, ${lon.toFixed(3)}`
        }

        // 2) 날씨: 동일 좌표로 OpenWeather
        const r = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${owmKey}`,
          { signal: controller.signal }
        )
        if (!r.ok) throw new Error(await r.text().catch(() => 'weather error'))
        const json = await r.json()

        setWeather({
          city: city || '현재 위치',
          temp: Math.round(json.main?.temp),
          main: String(json.weather?.[0]?.main ?? ''),
          desc: String(json.weather?.[0]?.description ?? ''),
        })
      } catch (e: any) {
        setErr(e?.message || '날씨 실패')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [userLocation])

  return (
    <TopBarWrapper>
      <TopBarHeader>
        <Logo>
          {userId && <span className="user">{userId}의</span>}
          <span className="main">먹킷리스트</span>
        </Logo>

        <WeatherBadge
          role="status"
          aria-live="polite"
          aria-busy={loading ? 'true' : 'false'}
          title={weather ? weather.desc : err || '날씨'}
        >
          <span className="emoji">{emoji}</span>
          <span className="text">
            {loading
              ? '로딩중…'
              : weather
                ? `${weather.city} ${weather.temp}° · ${weather.desc}`
                : err
                  ? `오류: ${err}`
                  : '날씨 정보 대기'}
          </span>
        </WeatherBadge>

        <AuthButtons>
          {userId ? (
            <AuthButton
              onClick={async () => {
                try {
                  if (onLogout) await onLogout()
                } catch {}
              }}
            >
              로그아웃
            </AuthButton>
          ) : (
            <>
              <AuthButton onClick={() => navigate('/login')}>로그인</AuthButton>
              <AuthButton onClick={() => navigate('/signup')}>
                회원가입
              </AuthButton>
            </>
          )}
        </AuthButtons>
      </TopBarHeader>

      <SearchArea>
        <LeftControls>
          {/* 지도 위치만 동기화 (날씨는 userLocation이 바뀌면 자동으로 갱신) */}
          <Button onClick={onSyncLocation}>
            <IconImg src="/icons/location.png" alt="위치" />
            위치 동기화
          </Button>
          <RadiusSelect
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value="500">500m</option>
            <option value="1000">1km</option>
          </RadiusSelect>
        </LeftControls>
        <SearchInput
          placeholder="검색어 입력..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={handleSubmit}>
          <IconImg src="/icons/search.png" alt="검색" /> 검색
        </Button>
      </SearchArea>
    </TopBarWrapper>
  )
}

const TopBarWrapper = styled.header`
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 1rem;
  border-bottom: 1px solid #ccc;
`

const TopBarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`

const Logo = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .user {
    font-size: 0.85rem;
    color: #666;
  }
  .main {
    font-size: 1.5rem;
    color: #000;
  }
`

const WeatherBadge = styled.div`
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 999px;
  border: 1px solid #e6e8ec;
  background: #f8fafc;
  font-size: 0.95rem;
  .emoji {
    font-size: 1.1rem;
    line-height: 1;
  }
  .text {
    white-space: nowrap;
    color: #333;
  }
`

const AuthButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const AuthButton = styled.button`
  border: 1px solid #0077cc;
  background-color: transparent;
  color: #0077cc;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    color: #fff;
    background-color: #0077cc;
  }
`

const SearchArea = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`

const LeftControls = styled.div`
  display: flex;
  gap: 0.5rem;
`

const RadiusSelect = styled.select`
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
`

const SearchInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  font-size: 1rem;
`

const Button = styled.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
`

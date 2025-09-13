const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'

const urlJoin = (path: string) => new URL(path, API_BASE_URL).toString()

type SearchReq = {
  keyword?: string
  keywords?: string[]
  userPosition?: { lat: number; lon: number }
  range?: number // km
}

export async function searchPlacesByKeyword(req: SearchReq) {
  const res = await fetch(urlJoin('/v1/search/places/keyword'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || '검색 API 오류')
  }
  const json = await res.json()
  return (json?.data ?? []) as any[]
}

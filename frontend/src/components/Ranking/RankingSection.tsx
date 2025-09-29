import styled from '@emotion/styled'
import type { RankingItem } from '@/types/ranking'
import { Spinner } from '@/components/common/Spinner'
import { IconImg } from '@/components/common/IconImg'
import { keyframes } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'

export interface SentimentResult {
  sentiment: string
  score: number
  emoji: string
  percent: number
  raw: {
    top_label: string
    top_prob: number
    keywords?: string[]
    ui?: { emoji: string; percent: number }
  }
}

interface Props {
  items: RankingItem[]
  loading?: boolean
  keyword?: string
  userId?: string | null
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const urlJoin = (path: string) => new URL(path, API_BASE_URL).toString()

function useInView<T extends Element>(
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: '120px 0px',
    threshold: 0.01,
  }
) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        io.unobserve(el) // 한 번 보이면 계속 유지
      }
    }, options)
    io.observe(el)
    return () => {
      try {
        io.disconnect()
      } catch {}
    }
  }, [options])

  return { ref, inView }
}

export function RankingSection({ items, loading, keyword, userId }: Props) {
  return (
    <Section>
      <Header>
        <h2>
          <IconImg src="/icons/restaurant.png" alt="레스토랑" />
          식당 랭킹 {keyword ? <small>— “{keyword}”</small> : null}
        </h2>
      </Header>

      {loading ? (
        <Spinner />
      ) : !items || items.length === 0 ? (
        <Empty>
          아직 검색 결과가 없습니다. 상단에서 키워드를 검색해 보세요.
        </Empty>
      ) : (
        <RankingList>
          {items.slice(0, 5).map((item, i) => (
            <LazyRankRow
              item={item}
              index={i}
              key={item.rank}
              userId={userId}
            />
          ))}
        </RankingList>
      )}
    </Section>
  )
}

function toKo(en: string): {
  ko: string
  tone: 'vpos' | 'pos' | 'neu' | 'neg' | 'vneg' | 'unk' | 'err'
} {
  const s = (en || '').toLowerCase()
  if (s.includes('very') && s.includes('positive'))
    return { ko: '매우 긍정', tone: 'vpos' }
  if (s.includes('positive')) return { ko: '긍정', tone: 'pos' }
  if (s.includes('neutral')) return { ko: '중립', tone: 'neu' }
  if (s.includes('very') && s.includes('negative'))
    return { ko: '매우 부정', tone: 'vneg' }
  if (s.includes('negative')) return { ko: '부정', tone: 'neg' }
  if (s.includes('error')) return { ko: '오류', tone: 'err' }
  return { ko: '알 수 없음', tone: 'unk' }
}

function LazyRankRow({
  item,
  index,
  userId,
}: {
  item: RankingItem
  index: number
  userId?: string | null
}) {
  const { ref, inView } = useInView<HTMLLIElement>()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [btnHover, setBtnHover] = useState(false)

  const [senti, setSenti] = useState<SentimentResult | null>(null)
  const [sentiLoading, setSentiLoading] = useState(false)
  const [sentiErr, setSentiErr] = useState<string | null>(null)
  const debTimer = useRef<number | null>(null)
  const reqAbort = useRef<AbortController | null>(null)

  const restaurantId = (item as any).restaurant_id ?? (item as any).id ?? null

  useEffect(() => {
    if (!open) return
    const t = text.trim()
    if (debTimer.current) window.clearTimeout(debTimer.current)
    if (t.length < 5 || !restaurantId || !userId) {
      setSenti(null)
      setSentiErr(null)
      setSentiLoading(false)
      return
    }
    debTimer.current = window.setTimeout(async () => {
      try {
        setSentiLoading(true)
        setSentiErr(null)
        if (reqAbort.current) reqAbort.current.abort()
        reqAbort.current = new AbortController()
        const res = await fetch(urlJoin('/sentiment/test'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: reqAbort.current.signal,
          body: JSON.stringify({
            text: t,
            restaurant_id: String(restaurantId),
            source: 'user',
            user_id: userId,
          }),
        })
        if (!res.ok)
          throw new Error(await res.text().catch(() => '감성 분석 실패'))
        const data = (await res.json()) as SentimentResult
        setSenti(data)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setSentiErr(e?.message || '분석 오류')
          setSenti(null)
        }
      } finally {
        setSentiLoading(false)
      }
    }, 500) as unknown as number
    return () => {
      if (debTimer.current) window.clearTimeout(debTimer.current)
    }
  }, [text, open, restaurantId, userId])

  async function submitReview() {
    setMsg(null)
    if (!userId) {
      setMsg('로그인이 필요합니다.')
      return
    }
    if (!restaurantId) {
      setMsg('리뷰 작성에 실패했습니다.')
      return
    }
    const t = text.trim()
    if (t.length < 5) {
      setMsg('리뷰는 최소 5자 이상 입력해 주세요.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch(urlJoin('/review/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: t,
          restaurant_id: String(restaurantId),
          user_id: userId,
          source: 'user',
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || '리뷰 작성에 실패했습니다.')
      }
      setText('')
      setMsg('리뷰를 작성했습니다.')
    } catch (e: any) {
      setMsg(e?.message || '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li ref={ref} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {inView ? (
        <RankItem
          delay={index * 90}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-open={open ? 'true' : 'false'}
          data-hover-blocked={btnHover ? 'true' : 'false'}
        >
          <Row>
            <Left>
              <RankNo>{item.rank}위</RankNo>
              <Name>{item.marketName}</Name>
              <Meta>
                <span>{item.marketAddress}</span>
                <Dot>·</Dot>
                <span>리뷰 {item.reviewCount.toLocaleString()}개</span>
                <Dot>·</Dot>
                <span>총점 {item.finalScore.toFixed(1)}</span>
              </Meta>
              <Preview>{item.preview || ''}</Preview>
              <Keywords>
                {item.relatedKeyword.map((k, i) => (
                  <Keyword key={i}>#{k}</Keyword>
                ))}
              </Keywords>
              <Hint>{open ? '리뷰 입력 ▲' : '리뷰 입력 ▼'}</Hint>
            </Left>
            <Right>
              <OpenBtn
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!item.marketUrl) return
                  window.open(item.marketUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                지도 열기
              </OpenBtn>
            </Right>
          </Row>
          {open && (
            <div onClick={(e) => e.stopPropagation()}>
              {userId ? (
                <ReviewBox>
                  <ReviewHeader>
                    <Title>
                      <IconImg src="/icons/review.png" alt="리뷰" />
                      {userId} 님의 리뷰
                    </Title>
                    {sentiLoading && <BadgeNeutral>분석 중…</BadgeNeutral>}
                    {!sentiLoading &&
                      senti &&
                      (() => {
                        const { ko, tone } = toKo(senti.sentiment)
                        return (
                          <SentimentBadge data-tone={tone}>
                            <span className="emoji">{senti.emoji || '🔍'}</span>
                            <span className="label">{ko}</span>
                            <span className="percent">{senti.percent}%</span>
                          </SentimentBadge>
                        )
                      })()}
                    {!sentiLoading &&
                      !senti &&
                      text.trim().length >= 5 &&
                      sentiErr && (
                        <BadgeError title={sentiErr}>분석 오류</BadgeError>
                      )}
                  </ReviewHeader>
                  <ReviewTextarea
                    placeholder="이 식당에 대한 후기를 남겨주세요 (5자 이상)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={submitting || !restaurantId}
                    rows={3}
                  />
                  <ReviewActions>
                    <ReviewHelp>
                      {!restaurantId
                        ? '리뷰를 저장할 수 없습니다.'
                        : `${text.trim().length}자`}
                    </ReviewHelp>
                    <SubmitBtn
                      onClick={submitReview}
                      disabled={
                        submitting || !restaurantId || text.trim().length < 5
                      }
                    >
                      리뷰하기
                    </SubmitBtn>
                  </ReviewActions>
                  {msg && <ReviewMsg>{msg}</ReviewMsg>}
                </ReviewBox>
              ) : (
                <LoginNotice>
                  리뷰를 작성하려면 <b>로그인</b>이 필요합니다.
                </LoginNotice>
              )}
            </div>
          )}
        </RankItem>
      ) : (
        <Skeleton />
      )}
    </li>
  )
}
const Section = styled.section`
  background: #fff;
  padding: 1rem;
  margin-top: 1rem;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  h2 {
    margin: 0;
  }
  small {
    color: #666;
    font-weight: 400;
  }
`

const Empty = styled.div`
  padding: 1rem;
  color: #666;
`

const RankingList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`
const Skeleton = styled.div`
  height: 118px;
  border-radius: 10px;
  margin-bottom: 0.6rem;
  border: 1px solid #eef1f6;
  background: linear-gradient(90deg, #f3f5f9 0%, #e9edf3 20%, #f3f5f9 40%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.995);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
`

const RankItem = styled.li<{ delay: number }>`
  background: #f8f9fb;
  border: 1px solid #e9edf3;
  border-radius: 10px;
  margin-bottom: 0.6rem;
  padding: 0.9rem 0.95rem;
  display: block;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.05s ease;
  &:hover {
    background: #f2f5fa;
  }
  &[data-hover-blocked='true']:hover {
    background: #f8f9fb;
  }
  &:active {
    transform: scale(0.998);
  }
  opacity: 0;
  animation: ${fadeUp} 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: ${({ delay }) => `${delay}ms`};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }
`
const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
`

const Left = styled.div`
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  gap: 0.25rem;
  overflow: hidden;
`

const RankNo = styled.span`
  font-weight: 700;
  color: #3b82f6;
`

const Name = styled.div`
  font-weight: 700;
  font-size: 1.05rem;
`

const Meta = styled.div`
  display: flex;
  gap: 0.35rem;
  color: #667085;
  font-size: 0.9rem;
`

const Dot = styled.span`
  color: #c0c4cc;
`

const Preview = styled.div`
  position: relative;
  color: #475467;
  font-size: 0.92rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  padding-left: 0.3rem;
  padding-right: 0.3rem;
  &::before {
    content: '“';
    position: absolute;
    left: 0;
    top: 0;
  }
  &::after {
    content: '”';
    position: absolute;
    right: 0.2rem;
    bottom: 0;
    background: linear-gradient(to right, rgba(248, 249, 251, 0), #f8f9fb 60%);
    padding-left: 0.2rem;
  }
`

const Keywords = styled.div`
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
`

const Keyword = styled.span`
  background: #eef6ff;
  color: #1d4ed8;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.8rem;
`

const Hint = styled.div`
  margin-top: 0.1rem;
  font-size: 0.82rem;
  color: #6b7280;
`

const Right = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  margin-left: auto;
`

const OpenBtn = styled.button`
  border: 1px solid #0077cc;
  background-color: transparent;
  color: #0077cc;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  white-space: nowrap;
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

const ReviewBox = styled.div`
  margin-top: 0.75rem;
  background: #fff;
  border: 1px solid #e9edf3;
  border-radius: 8px;
  padding: 0.6rem;
  display: grid;
  gap: 0.45rem;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`

const ReviewHeader = styled.div`
  font-size: 0.9rem;
  color: #475467;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Title = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
`

const SentimentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.82rem;
  line-height: 1;
  background: transparent;
  color: #374151;
  .emoji {
    font-size: 1rem;
    line-height: 1;
  }
  .sep {
    color: #9ca3af;
  }
`

const BadgeNeutral = styled(SentimentBadge)``
const BadgeError = styled(SentimentBadge)``

const ReviewTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  resize: vertical;
  border: 1px solid #dcdfe3;
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.95rem;
  &:focus {
    outline: none;
    border-color: #0077cc;
    box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.12);
  }
`

const ReviewActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ReviewHelp = styled.div`
  font-size: 0.85rem;
  color: #667085;
`

const SubmitBtn = styled.button`
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ReviewMsg = styled.div`
  font-size: 0.85rem;
  color: #0f766e;
`

const LoginNotice = styled.div`
  margin-top: 0.6rem;
  padding: 0.6rem;
  border: 1px dashed #d1d5db;
  background: #fff;
  border-radius: 8px;
  color: #374151;
  font-size: 0.92rem;
`

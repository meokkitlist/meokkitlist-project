import styled from '@emotion/styled'
import type { RankingItem } from '@/types/ranking'
import { Spinner } from '@/components/common/Spinner'
import { keyframes } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  items: RankingItem[]
  loading?: boolean
  keyword?: string
}

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

export function RankingSection({ items, loading, keyword }: Props) {
  return (
    <Section>
      <Header>
        <h2>🍽️ 식당 랭킹 {keyword ? <small>— “{keyword}”</small> : null}</h2>
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
            <LazyRankRow item={item} index={i} key={item.rank} />
          ))}
        </RankingList>
      )}
    </Section>
  )
}

function LazyRankRow({ item, index }: { item: RankingItem; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>()

  return (
    <li ref={ref} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {inView ? (
        <RankItem
          delay={index * 90}
          title={`${item.marketAddress} · 네이버 ${item.naverScore}점`}
        >
          <Left>
            <RankNo>{item.rank}위</RankNo>
            <Name>{item.marketName}</Name>
            <Meta>
              <span>{item.marketAddress}</span>
              <Dot>·</Dot>
              <span>리뷰 {item.reviewCount.toLocaleString()}개</span>
              <Dot>·</Dot>
              <span>총점 {item.totalScore.toFixed(1)}</span>
            </Meta>
            <Preview>“{item.reviewPreview}”</Preview>
            <Keywords>
              {item.relatedKeyword.map((k, i) => (
                <Keyword key={i}>#{k}</Keyword>
              ))}
            </Keywords>
          </Left>
          <Right>
            <OpenBtn
              onClick={(e) => {
                e.stopPropagation()
                window.open(item.marketUrl, '_blank')
              }}
            >
              지도 열기
            </OpenBtn>
          </Right>
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
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  transition:
    background 0.15s ease,
    transform 0.05s ease;
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

const Left = styled.div`
  display: grid;
  gap: 0.25rem;
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
  color: #475467;
  font-size: 0.92rem;
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

const Right = styled.div`
  display: flex;
  align-items: center;
`

export const OpenBtn = styled.button`
  --bs-primary: #0d6efd;

  appearance: none;
  border: 1px solid var(--bs-primary);
  background: transparent;
  color: var(--bs-primary);
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  line-height: 1.5;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    color: #fff;
    background-color: var(--bs-primary);
    border-color: var(--bs-primary);
  }

  &:focus {
    outline: 0;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  }

  &:active {
    color: #fff;
    background-color: #0b5ed7;
    border-color: #0a58ca;
  }

  &:disabled {
    opacity: 0.65;
    pointer-events: none;
  }
`

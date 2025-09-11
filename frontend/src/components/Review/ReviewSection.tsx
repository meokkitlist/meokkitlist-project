import styled from '@emotion/styled'

export function ReviewSection() {
  return (
    <Section>
      <h2>📝 후기 작성 및 감성 분석</h2>
      <ReviewTextarea placeholder="후기를 입력하세요 (예: 고기가 부드럽고 직원도 친절했어요)" />
      <AnalyzeButton>분석하기</AnalyzeButton>
      <AnalysisResult>
        <p>감정: 긍정적</p>
        <p>점수: 92.0%</p>
      </AnalysisResult>
    </Section>
  )
}

const Section = styled.section`
  background: #fff;
  padding: 1rem;
  margin-top: 1rem;
`

const ReviewTextarea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
`

const AnalyzeButton = styled.button`
  padding: 0.5rem 1rem;
  background: #0077cc;
  color: white;
  border: none;
  cursor: pointer;
`

const AnalysisResult = styled.div`
  margin-top: 0.5rem;
  font-weight: bold;
`

import styled from '@emotion/styled'

export function Spinner() {
  return (
    <SpinnerWrapper>
      <Loader />
    </SpinnerWrapper>
  )
}

const SpinnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
`

const Loader = styled.div`
  width: 36px;
  height: 36px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

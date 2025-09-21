import styled from '@emotion/styled'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout/Layout'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const urlJoin = (path: string) => new URL(path, API_BASE_URL).toString()

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const redirectTo = params.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력하세요.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(urlJoin('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      console.log(res)

      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || '로그인에 실패했습니다.')
      }

      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function goSignup() {
    navigate('/signup')
  }

  return (
    <Layout>
      <Wrapper>
        <Card>
          <Title>로그인</Title>
          <Form onSubmit={handleSubmit} noValidate>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <Label htmlFor="password">비밀번호</Label>
            <PwRow>
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <SmallBtn
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label="비밀번호 표시 전환"
              >
                {showPw ? '숨기기' : '표시'}
              </SmallBtn>
            </PwRow>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <SubmitBtn type="submit" disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </SubmitBtn>

            <MutedRow>
              아직 계정이 없나요?{' '}
              <LinkBtn type="button" onClick={goSignup}>
                회원가입
              </LinkBtn>
            </MutedRow>
          </Form>
        </Card>
      </Wrapper>
    </Layout>
  )
}

const Wrapper = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #f6f7f9;
  padding: 1rem;
`

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`

const Title = styled.h1`
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Label = styled.label`
  font-size: 0.9rem;
  color: #333;
`

const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #dcdfe3;
  border-radius: 10px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #0077cc;
    box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.12);
  }
`

const PwRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const ErrorMsg = styled.div`
  color: #c62828;
  background: #fdecea;
  border: 1px solid #f2c1bf;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  font-size: 0.9rem;
`

const SmallBtn = styled.button`
  flex: 0 0 auto;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #e4e6eb;
  background: #f8f9fb;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  margin-top: 0.25rem;
  padding: 0.7rem 1rem;
  background: #0077cc;
  color: #fff;
  border: 0;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const MutedRow = styled.div`
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.9rem;
  display: flex;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
`

const LinkBtn = styled.button`
  background: none;
  border: none;
  color: #0077cc;
  cursor: pointer;
  padding: 0;
`

import styled from '@emotion/styled'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout/Layout'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const urlJoin = (path: string) => new URL(path, API_BASE_URL).toString()

export default function Signup() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim() || !password || !password2) {
      setError('모든 필드를 입력하세요.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(urlJoin('/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || '회원가입에 실패했습니다.')
      }

      setSuccess('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      setTimeout(() => navigate('/login', { replace: true }), 800)
    } catch (err: any) {
      setError(err.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <Wrapper>
        <Card>
          <Title>회원가입</Title>
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
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <Label htmlFor="password2">비밀번호 확인</Label>
            <Input
              id="password2"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              disabled={loading}
              required
            />

            {error && <ErrorMsg>{error}</ErrorMsg>}
            {success && <SuccessMsg>{success}</SuccessMsg>}

            <SubmitBtn type="submit" disabled={loading}>
              {loading ? '가입 중…' : '회원가입'}
            </SubmitBtn>

            <MutedRow>
              이미 계정이 있나요?{' '}
              <LinkBtn type="button" onClick={() => navigate('/login')}>
                로그인
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

const ErrorMsg = styled.div`
  color: #c62828;
  background: #fdecea;
  border: 1px solid #f2c1bf;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  font-size: 0.9rem;
`

const SuccessMsg = styled.div`
  color: #1b5e20;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  font-size: 0.9rem;
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

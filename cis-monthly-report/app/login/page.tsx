'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      } else {
        // 로그인 후 교회 기본 언어로 리디렉션
        let locale = 'ko'
        try {
          const sessionRes = await fetch('/api/auth/session')
          const session = await sessionRes.json()
          const churchId = session?.user?.churchId
          if (churchId) {
            const churchesRes = await fetch('/api/churches')
            const churches = await churchesRes.json()
            const church = churches.find((c: { id: number; defaultLocale?: string }) => c.id === churchId)
            if (church?.defaultLocale) locale = church.defaultLocale
          }
        } catch {
          // 실패 시 기본값 'ko' 유지
        }
        router.push(`/${locale}/expenses`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">CIS 지역 재정관리</h1>
            <p className="text-xs text-gray-400 mt-1">Финансы церкви СНГ</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">아이디 / Имя пользователя</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">비밀번호 / Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '로그인 중...' : '로그인 / Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CIS 지역 재정관리 — 로그인',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

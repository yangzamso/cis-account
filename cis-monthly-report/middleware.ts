import { auth } from '@/auth'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import { locales, defaultLocale } from './i18n'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export default auth((req) => {
  const { pathname } = req.nextUrl

  // API 및 인증 불필요 경로 — intl 적용 없이 통과
  if (pathname.startsWith('/api/') || pathname === '/login') {
    return NextResponse.next()
  }

  // 미로그인 → 로그인 페이지로
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}

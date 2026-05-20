import { NextRequest, NextResponse } from 'next/server'

// fawazahmed0/currency-api — 완전 무료, API 키 불필요
// https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/usd.json

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function isWeekend(d: Date) {
  const day = d.getDay()
  return day === 0 || day === 6
}

// 해당 날짜에서 과거 방향으로 가장 가까운 평일을 반환
function nearestPastWeekday(d: Date): Date {
  const r = new Date(d)
  while (isWeekend(r)) r.setDate(r.getDate() - 1)
  return r
}

function isCurrentOrFutureMonth(year: number, month: number): boolean {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  return year > curYear || (year === curYear && month >= curMonth)
}

async function fetchRatesLatest(): Promise<{ usd: Record<string, number>; date: string }> {
  // 이번 달: @latest 사용 — CDN이 제공하는 가장 최신 데이터 + 실제 기준일 자동 반환
  const url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`외부 API 오류: ${res.status}`)
  return res.json()
}

async function fetchRatesForDate(dateStr: string): Promise<{ usd: Record<string, number>; date: string }> {
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`외부 API 오류: ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!year || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    let data: { usd: Record<string, number>; date: string }

    if (isCurrentOrFutureMonth(year, month)) {
      // 이번 달 이후: @latest — CDN 최신 데이터를 그대로 사용 (날짜 고정 불필요)
      data = await fetchRatesLatest()
    } else {
      // 이전 달: 해당 월 마지막 평일 기준, 데이터 없으면 하루씩 앞당겨 재시도
      const targetDate = nearestPastWeekday(new Date(year, month, 0))
      let dateStr = formatDate(targetDate)
      let tried = 0
      while (tried < 7) {
        try {
          data = await fetchRatesForDate(dateStr)
          break
        } catch {
          targetDate.setDate(targetDate.getDate() - 1)
          while (isWeekend(targetDate)) targetDate.setDate(targetDate.getDate() - 1)
          dateStr = formatDate(targetDate)
          tried++
        }
      }
      if (!data!) throw new Error('환율 데이터를 가져올 수 없습니다.')
    }

    const usd = data.usd
    const krw = usd['krw'] ?? 0

    const rates = {
      USD: { rateToUsd: 1,               usdToKrw: krw },
      RUB: { rateToUsd: usd['rub'] ?? 0, usdToKrw: krw },
      UZS: { rateToUsd: usd['uzs'] ?? 0, usdToKrw: krw },
      UAH: { rateToUsd: usd['uah'] ?? 0, usdToKrw: krw },
      KZT: { rateToUsd: usd['kzt'] ?? 0, usdToKrw: krw },
    }

    return NextResponse.json({ rates, referenceDate: data.date })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

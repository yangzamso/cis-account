import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { currencyRates } from '@/db/schema'
import { eq, and, or, lt, desc } from 'drizzle-orm'

const CURRENCIES = ['USD', 'RUB', 'UZS', 'UAH', 'KZT']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!year || !month) return NextResponse.json([], { status: 400 })

  const rows = await db.select()
    .from(currencyRates)
    .where(and(eq(currencyRates.year, year), eq(currencyRates.month, month)))

  // referenceDate is shared across all currency rows for a given month
  const referenceDate = rows[0]?.referenceDate ?? ''
  return NextResponse.json({ rows, referenceDate })
}

// 해당 월 직전 기록 가져오기 (자동채움용)
export async function PUT(req: NextRequest) {
  const { year, month } = await req.json()
  if (!year || !month) return NextResponse.json([], { status: 400 })

  const results: Record<string, { rateToUsd: number; usdToKrw: number; sourceYear: number; sourceMonth: number }> = {}

  for (const cc of CURRENCIES) {
    const prev = await db.select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.currencyCode, cc),
        or(
          lt(currencyRates.year, year),
          and(eq(currencyRates.year, year), lt(currencyRates.month, month))
        )
      ))
      .orderBy(desc(currencyRates.year), desc(currencyRates.month))
      .limit(1)

    if (prev[0]) {
      results[cc] = { rateToUsd: prev[0].rateToUsd, usdToKrw: prev[0].usdToKrw, sourceYear: prev[0].year, sourceMonth: prev[0].month }
    }
  }

  return NextResponse.json(results)
}

// 저장 (upsert per currency)
export async function POST(req: NextRequest) {
  const { year, month, rates, referenceDate } = await req.json()
  // rates: { [currencyCode]: { rateToUsd, usdToKrw } }
  if (!year || !month || !rates) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const refDate: string = referenceDate ?? ''

  for (const [cc, vals] of Object.entries(rates) as [string, { rateToUsd: number; usdToKrw: number }][]) {
    const existing = await db.select({ id: currencyRates.id })
      .from(currencyRates)
      .where(and(eq(currencyRates.year, year), eq(currencyRates.month, month), eq(currencyRates.currencyCode, cc)))
      .limit(1)

    if (existing.length > 0) {
      const updateValues: Record<string, unknown> = { rateToUsd: Number(vals.rateToUsd), usdToKrw: Number(vals.usdToKrw) }
      if (refDate) updateValues.referenceDate = refDate
      await db.update(currencyRates)
        .set(updateValues)
        .where(eq(currencyRates.id, existing[0].id))
    } else {
      await db.insert(currencyRates).values({
        year, month, currencyCode: cc,
        rateToUsd: Number(vals.rateToUsd),
        usdToKrw: Number(vals.usdToKrw),
        referenceDate: refDate,
      })
    }
  }

  return NextResponse.json({ ok: true })
}

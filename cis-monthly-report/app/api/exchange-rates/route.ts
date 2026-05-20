import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { exchangeRates } from '@/db/schema'
import { eq, and, or, lt, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  if (!churchId) return NextResponse.json([], { status: 400 })

  const rows = await db.select()
    .from(exchangeRates)
    .where(eq(exchangeRates.churchId, churchId))
    .orderBy(desc(exchangeRates.year), desc(exchangeRates.month))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { churchId, year, month, rateToUsd, usdToKrw, autoFill } = body

  if (!churchId || !year || !month) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // autoFill: 이번 달 기록이 없으면 가장 최근 기록을 복사해서 저장
  if (autoFill) {
    const existing = await db.select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.churchId, churchId), eq(exchangeRates.year, year), eq(exchangeRates.month, month)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(existing[0])
    }

    const recent = await db.select()
      .from(exchangeRates)
      .where(and(
        eq(exchangeRates.churchId, churchId),
        or(
          lt(exchangeRates.year, year),
          and(eq(exchangeRates.year, year), lt(exchangeRates.month, month))
        )
      ))
      .orderBy(desc(exchangeRates.year), desc(exchangeRates.month))
      .limit(1)

    if (recent.length === 0) {
      return NextResponse.json({ error: 'No previous rate found' }, { status: 404 })
    }

    const [inserted] = await db.insert(exchangeRates).values({
      churchId,
      year,
      month,
      rateToUsd: recent[0].rateToUsd,
      usdToKrw: recent[0].usdToKrw,
    }).returning()

    return NextResponse.json(inserted)
  }

  // 일반 저장: upsert (같은 연/월 있으면 update)
  const existing = await db.select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.churchId, churchId), eq(exchangeRates.year, year), eq(exchangeRates.month, month)))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db.update(exchangeRates)
      .set({ rateToUsd: Number(rateToUsd), usdToKrw: Number(usdToKrw) })
      .where(eq(exchangeRates.id, existing[0].id))
      .returning()
    return NextResponse.json(updated)
  }

  const [inserted] = await db.insert(exchangeRates).values({
    churchId,
    year,
    month,
    rateToUsd: Number(rateToUsd),
    usdToKrw: Number(usdToKrw),
  }).returning()

  return NextResponse.json(inserted)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await db.delete(exchangeRates).where(eq(exchangeRates.id, id))
  return NextResponse.json({ ok: true })
}

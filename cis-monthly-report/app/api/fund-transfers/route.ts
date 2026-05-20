import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { fundTransfers } from '@/db/schema'
import { eq, and, like } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year  = searchParams.get('year')
  const month = searchParams.get('month')
  if (!churchId || !year) return NextResponse.json([], )

  const dateFilter = month
    ? like(fundTransfers.date, `${year}-${String(month).padStart(2, '0')}-%`)
    : like(fundTransfers.date, `${year}-%`)

  const rows = await db.select().from(fundTransfers)
    .where(and(eq(fundTransfers.churchId, churchId), dateFilter))
    .orderBy(fundTransfers.date)

  return NextResponse.json(rows)
}

function calcRate(type: string, amountLocal: number, amountUsd: number): number {
  if ((type === 'cash_to_usd' || type === 'usd_to_cash') && amountUsd > 0) {
    return amountLocal / amountUsd
  }
  return 0
}

export async function POST(req: NextRequest) {
  const { churchId, date, type, amountLocal, amountUsd, note } = await req.json()
  if (!churchId || !date || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const local = Number(amountLocal) || 0
  const usd   = Number(amountUsd)   || 0

  const [row] = await db.insert(fundTransfers).values({
    churchId: Number(churchId),
    date,
    type,
    amountLocal: local,
    amountUsd: usd,
    exchangeRate: calcRate(type, local, usd),
    note: note ?? '',
    createdAt: new Date().toISOString(),
  }).returning()

  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, date, type, amountLocal, amountUsd, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const local = Number(amountLocal) || 0
  const usd   = Number(amountUsd)   || 0

  const [row] = await db.update(fundTransfers)
    .set({ date, type, amountLocal: local, amountUsd: usd, exchangeRate: calcRate(type, local, usd), note: note ?? '' })
    .where(eq(fundTransfers.id, Number(id)))
    .returning()
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await db.delete(fundTransfers).where(eq(fundTransfers.id, id))
  return NextResponse.json({ ok: true })
}

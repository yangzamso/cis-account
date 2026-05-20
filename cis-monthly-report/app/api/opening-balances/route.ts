import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { openingBalances } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  if (!churchId) return NextResponse.json({ error: 'Missing churchId' }, { status: 400 })

  const rows = await db.select()
    .from(openingBalances)
    .where(eq(openingBalances.churchId, churchId))
    .orderBy(desc(openingBalances.year), desc(openingBalances.month))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { churchId, year, month, bankbookLocal, cashLocal, cashUsd, note } = await req.json()
  if (!churchId || !year || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const existing = await db.select({ id: openingBalances.id })
    .from(openingBalances)
    .where(and(
      eq(openingBalances.churchId, churchId),
      eq(openingBalances.year, year),
      eq(openingBalances.month, month),
    ))

  const values = {
    bankbookLocal: Number(bankbookLocal) || 0,
    cashLocal:     Number(cashLocal)     || 0,
    cashUsd:       Number(cashUsd)       || 0,
    note: note ?? '',
  }

  if (existing.length > 0) {
    await db.update(openingBalances).set(values).where(eq(openingBalances.id, existing[0].id))
    return NextResponse.json({ id: existing[0].id })
  } else {
    const [row] = await db.insert(openingBalances)
      .values({ churchId, year, month, ...values })
      .returning({ id: openingBalances.id })
    return NextResponse.json(row)
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await db.delete(openingBalances).where(eq(openingBalances.id, id))
  return NextResponse.json({ ok: true })
}

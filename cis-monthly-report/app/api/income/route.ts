import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { incomeRecords } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month')) // 0 = 전체

  if (!churchId || !year) return NextResponse.json([])

  try {
    const conditions = [
      eq(incomeRecords.churchId, churchId),
      eq(incomeRecords.year, year),
      ...(month ? [eq(incomeRecords.month, month)] : []),
    ]
    const rows = await db.select().from(incomeRecords)
      .where(and(...conditions))
      .orderBy(incomeRecords.date)
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[income GET]', e)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = body.date as string
  const [row] = await db.insert(incomeRecords).values({
    churchId: body.churchId,
    date,
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    tithes: body.tithes ?? 0,
    sundayOfferings: body.sundayOfferings ?? 0,
    thanksgiving: body.thanksgiving ?? 0,
    centerSupport: body.centerSupport ?? 0,
    otherOfferings: body.otherOfferings ?? 0,
    buildingFund: body.buildingFund ?? 0,
    hqBuildingFund: body.hqBuildingFund ?? 0,
    otherIncome: body.otherIncome ?? 0,
    currencyType: body.currencyType ?? 'usd',
    paymentMethod: body.paymentMethod ?? 'bank',
    notes: body.notes ?? '',
    createdAt: new Date().toISOString(),
  }).returning()
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const id = Number(body.id)
  const date = body.date as string
  const [row] = await db.update(incomeRecords).set({
    date,
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    tithes: body.tithes ?? 0,
    sundayOfferings: body.sundayOfferings ?? 0,
    thanksgiving: body.thanksgiving ?? 0,
    centerSupport: body.centerSupport ?? 0,
    otherOfferings: body.otherOfferings ?? 0,
    buildingFund: body.buildingFund ?? 0,
    hqBuildingFund: body.hqBuildingFund ?? 0,
    otherIncome: body.otherIncome ?? 0,
    currencyType: body.currencyType ?? 'usd',
    paymentMethod: body.paymentMethod ?? 'bank',
    notes: body.notes ?? '',
  }).where(eq(incomeRecords.id, id)).returning()
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  await db.delete(incomeRecords).where(eq(incomeRecords.id, id))
  return NextResponse.json({ ok: true })
}

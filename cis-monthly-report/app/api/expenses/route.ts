import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { expenseRecords } from '@/db/schema'
import { eq, and, like } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  const dateFilter = month
    ? like(expenseRecords.date, `${year}-${String(month).padStart(2, '0')}-%`)
    : like(expenseRecords.date, `${year}-%`)

  const rows = await db.select().from(expenseRecords).where(
    and(eq(expenseRecords.churchId, churchId), dateFilter)
  ).orderBy(expenseRecords.date)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = body.date as string

  const accountCode = (body.accountCode as string) || 'EXP-08'
  const accountNameKo = (body.accountNameKo as string) || '각종지출비'
  const accountNameRu = (body.accountNameRu as string) || 'Прочие расходы'

  try {
    const [row] = await db.insert(expenseRecords).values({
      churchId: Number(body.churchId),
      date,
      accountCode,
      accountNameKo,
      accountNameRu,
      currency: (body.currency as string) || 'USD',
      paymentMethod: (body.paymentMethod as string) || 'bank',
      amountUsd: Number(body.amountUsd) || 0,
      amountLocal: Number(body.amountLocal) || 0,
      descriptionKo: body.descriptionKo ?? '',
      descriptionRu: body.descriptionRu ?? '',
      merchantKo: body.merchantKo ?? '',
      merchantRu: body.merchantRu ?? '',
      managerKo: body.managerKo ?? '',
      managerRu: body.managerRu ?? '',
      receiptAttached: Boolean(body.receiptAttached),
      notes: body.notes ?? '',
      status: 'draft',
      createdBy: body.createdBy ? Number(body.createdBy) : null,
      createdAt: new Date().toISOString(),
    }).returning()
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    console.error('[POST /api/expenses] DB error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  await db.delete(expenseRecords).where(eq(expenseRecords.id, id))
  return NextResponse.json({ ok: true })
}

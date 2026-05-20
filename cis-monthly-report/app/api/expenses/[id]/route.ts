import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { expenseRecords } from '@/db/schema'
import { eq } from 'drizzle-orm'

// PATCH /api/expenses/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.status !== undefined)          updates.status = body.status
  if (body.date !== undefined)            updates.date = body.date
  if (body.accountCode !== undefined)     updates.accountCode = body.accountCode
  if (body.accountNameKo !== undefined)   updates.accountNameKo = body.accountNameKo
  if (body.accountNameRu !== undefined)   updates.accountNameRu = body.accountNameRu
  if (body.merchantKo !== undefined)      updates.merchantKo = body.merchantKo
  if (body.merchantRu !== undefined)      updates.merchantRu = body.merchantRu
  if (body.managerKo !== undefined)       updates.managerKo = body.managerKo
  if (body.managerRu !== undefined)       updates.managerRu = body.managerRu
  if (body.descriptionKo !== undefined)   updates.descriptionKo = body.descriptionKo
  if (body.descriptionRu !== undefined)   updates.descriptionRu = body.descriptionRu
  if (body.currency !== undefined)        updates.currency = body.currency
  if (body.paymentMethod !== undefined)   updates.paymentMethod = body.paymentMethod
  if (body.amountUsd !== undefined)       updates.amountUsd = Number(body.amountUsd)
  if (body.amountLocal !== undefined)     updates.amountLocal = Number(body.amountLocal)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const [row] = await db
      .update(expenseRecords)
      .set(updates)
      .where(eq(expenseRecords.id, Number(id)))
      .returning()
    return NextResponse.json(row)
  } catch (e) {
    console.error('[PATCH /api/expenses/:id]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

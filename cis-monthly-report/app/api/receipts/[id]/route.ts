import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { receipts, expenseRecords } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

// GET /api/receipts/[id]  → 이미지 데이터 반환
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [row] = await db.select().from(receipts).where(eq(receipts.id, Number(id)))
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = Buffer.from(row.data, 'base64')
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': row.mimeType,
      'Content-Disposition': `inline; filename="${row.filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

// DELETE /api/receipts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deleted] = await db.delete(receipts).where(eq(receipts.id, Number(id))).returning({ expenseRecordId: receipts.expenseRecordId })
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 해당 지출에 영수증이 더 없으면 플래그 해제
  const [{ remaining }] = await db
    .select({ remaining: count() })
    .from(receipts)
    .where(eq(receipts.expenseRecordId, deleted.expenseRecordId))

  if (remaining === 0) {
    await db.update(expenseRecords).set({ receiptAttached: false }).where(eq(expenseRecords.id, deleted.expenseRecordId))
  }

  return NextResponse.json({ ok: true })
}

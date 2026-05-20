import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { receipts, expenseRecords } from '@/db/schema'
import { lt, eq, count, inArray } from 'drizzle-orm'

// POST /api/receipts/cleanup
// 만료된 영수증 삭제 + receiptAttached 플래그 정리
// Vercel Cron 또는 수동 호출: Authorization: Bearer <CLEANUP_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CLEANUP_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()

  // 만료된 영수증의 expenseRecordId 수집
  const expired = await db
    .select({ id: receipts.id, expenseRecordId: receipts.expenseRecordId })
    .from(receipts)
    .where(lt(receipts.expiresAt, now))

  if (expired.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  const expiredIds = expired.map((r) => r.id)
  const affectedExpenseIds = [...new Set(expired.map((r) => r.expenseRecordId))]

  await db.delete(receipts).where(inArray(receipts.id, expiredIds))

  // 삭제 후 영수증이 0개인 지출 레코드 플래그 해제
  for (const expenseId of affectedExpenseIds) {
    const [{ remaining }] = await db
      .select({ remaining: count() })
      .from(receipts)
      .where(eq(receipts.expenseRecordId, expenseId))

    if (remaining === 0) {
      await db.update(expenseRecords).set({ receiptAttached: false }).where(eq(expenseRecords.id, expenseId))
    }
  }

  return NextResponse.json({ deleted: expiredIds.length })
}

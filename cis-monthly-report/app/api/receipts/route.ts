import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { receipts, expenseRecords } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB per image
const EXPIRE_DAYS = 30

// GET /api/receipts?expenseRecordId=123
export async function GET(req: NextRequest) {
  const expenseRecordId = Number(req.nextUrl.searchParams.get('expenseRecordId'))
  if (!expenseRecordId) return NextResponse.json({ error: 'expenseRecordId required' }, { status: 400 })

  const rows = await db
    .select({ id: receipts.id, filename: receipts.filename, mimeType: receipts.mimeType, createdAt: receipts.createdAt, expiresAt: receipts.expiresAt })
    .from(receipts)
    .where(eq(receipts.expenseRecordId, expenseRecordId))

  return NextResponse.json(rows)
}

// POST /api/receipts  (multipart/form-data: file, expenseRecordId)
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const expenseRecordId = Number(form.get('expenseRecordId'))

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!expenseRecordId) return NextResponse.json({ error: 'expenseRecordId required' }, { status: 400 })

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다' }, { status: 413 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + EXPIRE_DAYS)

  const [row] = await db.insert(receipts).values({
    expenseRecordId,
    filename: file.name,
    mimeType: file.type,
    data: base64,
    expiresAt,
  }).returning({ id: receipts.id, filename: receipts.filename, expiresAt: receipts.expiresAt })

  // receiptAttached 플래그 업데이트
  await db.update(expenseRecords).set({ receiptAttached: true }).where(eq(expenseRecords.id, expenseRecordId))

  return NextResponse.json(row, { status: 201 })
}

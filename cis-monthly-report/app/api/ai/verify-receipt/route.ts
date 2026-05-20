import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { auth } from '@/auth'
import { db } from '@/db'
import { receipts, expenseRecords } from '@/db/schema'
import { eq } from 'drizzle-orm'

const VERIFY_PROMPT = (record: {
  date: string
  amount: number
  currency: string
  merchantRu: string
  merchantKo: string
  descriptionRu: string
}) => `
You are verifying a receipt image against an expense record.

Expense record:
- Date: ${record.date}
- Amount: ${record.amount} ${record.currency}
- Merchant: ${record.merchantRu} (${record.merchantKo})
- Description: ${record.descriptionRu}

Look at the receipt image and respond ONLY with valid JSON:
{
  "match": true or false,
  "confidence": "high" or "medium" or "low",
  "note": "brief explanation in Korean (1-2 sentences)"
}
No explanation. JSON only.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const { expenseRecordId } = await req.json()
  if (!expenseRecordId) return NextResponse.json({ error: 'expenseRecordId required' }, { status: 400 })

  const [record] = await db.select().from(expenseRecords).where(eq(expenseRecords.id, expenseRecordId))
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

  const [receipt] = await db.select().from(receipts).where(eq(receipts.expenseRecordId, expenseRecordId))
  if (!receipt) return NextResponse.json({ error: '영수증 이미지가 없습니다' }, { status: 404 })

  const amount = record.amountLocal > 0 ? record.amountLocal : record.amountUsd
  const currency = record.amountLocal > 0 ? '현지화폐' : 'USD'

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    VERIFY_PROMPT({ date: record.date, amount, currency, merchantRu: record.merchantRu, merchantKo: record.merchantKo, descriptionRu: record.descriptionRu }),
    { inlineData: { mimeType: receipt.mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: receipt.data } },
  ])

  const raw = result.response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  try {
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'AI 응답 파싱 실패', raw }, { status: 422 })
  }
}

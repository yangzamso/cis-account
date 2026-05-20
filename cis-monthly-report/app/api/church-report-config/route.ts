import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { churchReportConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  if (!churchId) return NextResponse.json({ error: 'Missing churchId' }, { status: 400 })

  const rows = await db.select().from(churchReportConfig).where(eq(churchReportConfig.churchId, churchId))
  return NextResponse.json(rows[0] ?? null)
}

export async function POST(req: NextRequest) {
  const { churchId, approvalLimit, withdrawer1, withdrawer2, financialSource, checkingStatus, feedback } = await req.json()
  if (!churchId) return NextResponse.json({ error: 'Missing churchId' }, { status: 400 })

  const values = {
    approvalLimit: Number(approvalLimit) || 0,
    withdrawer1: withdrawer1 ?? '',
    withdrawer2: withdrawer2 ?? '',
    financialSource: financialSource ?? '',
    checkingStatus: checkingStatus ?? '',
    feedback: feedback ?? '',
  }

  const existing = await db.select({ id: churchReportConfig.id })
    .from(churchReportConfig)
    .where(eq(churchReportConfig.churchId, churchId))

  if (existing.length > 0) {
    await db.update(churchReportConfig).set(values).where(eq(churchReportConfig.churchId, churchId))
    return NextResponse.json({ ok: true })
  } else {
    await db.insert(churchReportConfig).values({ churchId, ...values })
    return NextResponse.json({ ok: true })
  }
}

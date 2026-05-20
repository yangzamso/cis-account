import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { churches, churchReportConfig } from '@/db/schema'
import { buildMonthlyReport } from '@/lib/report-builder'
import { asc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year  = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!year || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const allChurches = await db.select().from(churches)
    .orderBy(sql`church_number IS NULL`, asc(churches.churchNumber), asc(churches.id))
  const configs     = await db.select().from(churchReportConfig)
  const configMap   = Object.fromEntries(configs.map(c => [c.churchId, c]))

  const results = await Promise.all(
    allChurches.map(async (church) => {
      const report = await buildMonthlyReport(church.id, year, month)
      const cfg    = configMap[church.id]
      return {
        ...report,
        churchNumber:    church.churchNumber ?? null,
        approvalLimit:   cfg?.approvalLimit   ?? 0,
        withdrawer1:     cfg?.withdrawer1     ?? '',
        withdrawer2:     cfg?.withdrawer2     ?? '',
        financialSource: cfg?.financialSource ?? '',
        checkingStatus:  cfg?.checkingStatus  ?? '',
      }
    })
  )

  return NextResponse.json(results)
}

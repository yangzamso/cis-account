import { NextRequest, NextResponse } from 'next/server'
import { buildMonthlyReport } from '@/lib/report-builder'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (!churchId || !year || !month) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const report = await buildMonthlyReport(churchId, year, month)
    return NextResponse.json(report)
  } catch (e) {
    console.error('[GET /api/reports/monthly]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

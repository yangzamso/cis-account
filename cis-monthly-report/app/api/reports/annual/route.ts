import { NextRequest, NextResponse } from 'next/server'
import { buildMonthlyReport } from '@/lib/report-builder'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = Number(searchParams.get('year'))

  if (!churchId || !year) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const reports = await Promise.all(
      Array.from({ length: 12 }, (_, i) => buildMonthlyReport(churchId, year, i + 1))
    )
    return NextResponse.json(reports)
  } catch (e) {
    console.error('[GET /api/reports/annual]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

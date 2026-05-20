import { NextRequest, NextResponse } from 'next/server'
import { buildMonthlyReport } from '@/lib/report-builder'
import { buildExcel } from '@/lib/excel-exporter'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (!churchId || !year || !month) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const report = await buildMonthlyReport(churchId, year, month)
  const buffer = await buildExcel(report)

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="monthly-report-${year}-${String(month).padStart(2, '0')}.xlsx"`,
    },
  })
}

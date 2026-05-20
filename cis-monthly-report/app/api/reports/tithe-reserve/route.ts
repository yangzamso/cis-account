import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { incomeRecords } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const churchId = Number(searchParams.get('churchId'))
  const year = Number(searchParams.get('year'))

  if (!churchId || !year) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const rows = []
  let prevBalance = 0

  for (let m = 1; m <= 12; m++) {
    const incomes = await db.select().from(incomeRecords).where(
      and(eq(incomeRecords.churchId, churchId), eq(incomeRecords.year, year), eq(incomeRecords.month, m))
    )

    const totalOfferings = incomes.reduce((s, r) =>
      s + r.tithes + r.thanksgiving + r.sundayOfferings + r.otherOfferings, 0)
    const oneTenth = totalOfferings / 10

    // remittanceToHq would come from expense EXP-01, simplified: 0 for now
    const remittanceToHq = 0
    const balance = prevBalance + oneTenth - remittanceToHq

    rows.push({ month: m, totalOfferings, oneTenth, prevBalance, remittanceToHq, balance })
    prevBalance = balance
  }

  return NextResponse.json(rows)
}

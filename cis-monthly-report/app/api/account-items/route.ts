import { NextResponse } from 'next/server'
import { db } from '@/db'
import { accountItems } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db.select().from(accountItems).orderBy(accountItems.sortOrder)
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET /api/account-items]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

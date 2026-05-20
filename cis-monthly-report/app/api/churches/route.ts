import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { churches } from '@/db/schema'
import { asc, eq, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db.select().from(churches)
      .orderBy(sql`church_number IS NULL`, asc(churches.churchNumber), asc(churches.id))
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET /api/churches]', e)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [row] = await db.insert(churches).values({
    churchNumber: body.churchNumber ? Number(body.churchNumber) : null,
    nameKo: body.nameKo,
    nameRu: body.nameRu,
    currencyCode: body.currencyCode ?? 'USD',
    country: body.country ?? '',
    createdAt: new Date().toISOString(),
  }).returning()
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const id = Number(body.id)
  const patch: Record<string, unknown> = {}
  if ('churchNumber' in body) patch.churchNumber = body.churchNumber != null ? Number(body.churchNumber) : null
  if ('defaultLocale' in body) patch.defaultLocale = body.defaultLocale
  const [row] = await db.update(churches)
    .set(patch)
    .where(eq(churches.id, id))
    .returning()
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  await db.delete(churches).where(eq(churches.id, id))
  return NextResponse.json({ ok: true })
}

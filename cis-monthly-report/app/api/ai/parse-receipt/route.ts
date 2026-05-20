import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Flash 버전만, 최신 → 구 순서로 폴백
const MODEL_PRIORITY = [
  'gemini-3.1-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

let cachedModel: string | null = null

async function resolveModel(genAI: GoogleGenerativeAI): Promise<string> {
  if (cachedModel) return cachedModel
  for (const name of MODEL_PRIORITY) {
    try {
      await genAI.getGenerativeModel({ model: name }).generateContent('ping')
      cachedModel = name
      console.log(`[AI] Resolved model: ${name}`)
      return name
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
        console.log(`[AI] ${name} unavailable, trying next...`)
        continue
      }
      cachedModel = name
      return name
    }
  }
  cachedModel = MODEL_PRIORITY[MODEL_PRIORITY.length - 1]
  return cachedModel
}

// 빠른 스캔용 — 날짜/금액/지출처만 추출
const SCAN_PROMPT = `Extract from this receipt image and return ONLY valid JSON:
{
  "date": "YYYY-MM-DD or null",
  "amount": number only without currency symbols or null,
  "currencyHint": "local" if rubles/руб/₽/tenge/тенге/som/сум, "usd" if dollar/USD/$, else "local",
  "merchant": "name of the business or person paid (in original language)"
}
No explanation. JSON only.`

// 번역용 — RU → KO
const TRANSLATE_PROMPT = (text: string) =>
  `Translate this Russian text to Korean concisely (1-2 sentences max). Return only the Korean translation, nothing else:\n${text}`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === '여기에_API_키_입력') {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = await resolveModel(genAI)
  const model = genAI.getGenerativeModel({ model: modelName })

  const contentType = req.headers.get('content-type') ?? ''

  // 번역 요청 (저장 시 RU → KO)
  if (contentType.includes('application/json')) {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ translated: '' })
    const result = await model.generateContent(TRANSLATE_PROMPT(text))
    return NextResponse.json({ translated: result.response.text().trim() })
  }

  // 이미지 스캔 요청
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const result = await model.generateContent([
      SCAN_PROMPT,
      { inlineData: { mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
    ])

    const raw = result.response.text().trim()
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    try {
      return NextResponse.json({ ...JSON.parse(json), _model: modelName })
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 422 })
    }
  }

  return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 })
}

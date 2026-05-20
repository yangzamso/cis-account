// 사용자 등록 스크립트
// 실행: node seed-users.mjs

import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'

// .env.local 직접 파싱
const envFile = readFileSync('.env.local', 'utf-8')
const envVars = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const DATABASE_URL = envVars.DATABASE_URL
if (!DATABASE_URL) { console.error('DATABASE_URL not found in .env.local'); process.exit(1) }

const sql = neon(DATABASE_URL)

const users = [
  { username: 'admin-crm', password: 'crm2026!',     nameKo: '러시아 크림',         nameRu: 'Россия Крым',       role: 'admin' },
  { username: 'admin-uzb', password: 'uzb2026!',     nameKo: '우즈베키스탄',         nameRu: 'Узбекистан',        role: 'admin' },
  { username: 'admin-ukr', password: 'ukr2026!',     nameKo: '우크라이나',           nameRu: 'Украина',           role: 'admin' },
  { username: 'admin-alm', password: 'alm2026!',     nameKo: '카자흐스탄 알마티',    nameRu: 'Казахстан Алматы',  role: 'admin' },
  { username: 'admin-atb', password: 'atb2026!',     nameKo: '카자흐스탄 악토베',    nameRu: 'Казахстан Актобе',  role: 'admin' },
]

const now = new Date().toISOString()

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 12)
  try {
    await sql`
      INSERT INTO users (username, password_hash, name_ko, name_ru, lang, role, church_id, created_at)
      VALUES (${u.username}, ${hash}, ${u.nameKo}, ${u.nameRu}, 'ko', ${u.role}, NULL, ${now})
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name_ko       = EXCLUDED.name_ko,
        name_ru       = EXCLUDED.name_ru,
        role          = EXCLUDED.role
    `
    console.log(`✅ ${u.username}`)
  } catch (e) {
    console.error(`❌ ${u.username}:`, e.message)
  }
}

console.log('\n완료!')

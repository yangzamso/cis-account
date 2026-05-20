import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 수동 파싱
const envPath = resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('1. add usd_to_krw to exchange_rates...')
  await sql`ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS usd_to_krw real NOT NULL DEFAULT 0`

  console.log('2. create currency_rates table...')
  await sql`
    CREATE TABLE IF NOT EXISTS currency_rates (
      id serial PRIMARY KEY,
      year integer NOT NULL,
      month integer NOT NULL,
      currency_code text NOT NULL,
      rate_to_usd real NOT NULL DEFAULT 0,
      usd_to_krw real NOT NULL DEFAULT 0
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_ym_cc ON currency_rates (year, month, currency_code)`

  console.log('3. add reference_date to currency_rates...')
  await sql`ALTER TABLE currency_rates ADD COLUMN IF NOT EXISTS reference_date text NOT NULL DEFAULT ''`

  console.log('4. update Aktobe church currency to USD...')
  await sql`UPDATE churches SET currency_code = 'USD' WHERE name_ko LIKE '%악토베%'`

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })

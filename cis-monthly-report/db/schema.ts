import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nameKo: text('name_ko').notNull().default(''),
  nameRu: text('name_ru').notNull().default(''),
  lang: text('lang').notNull().default('ko'),   // 'ko' | 'ru'
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  churchId: integer('church_id'),                // member는 소속 교회 고정
  createdAt: text('created_at').notNull().default(''),
})

export const churches = pgTable('churches', {
  id: serial('id').primaryKey(),
  churchNumber: integer('church_number'),              // 실질적인 교회번호 (11, 13, 14, ...)
  nameKo: text('name_ko').notNull(),
  nameRu: text('name_ru').notNull(),
  currencyCode: text('currency_code').notNull().default('USD'),
  country: text('country').notNull().default(''),
  defaultLocale: text('default_locale').notNull().default('ko'), // 'ko' | 'ru'
  createdAt: text('created_at').notNull().default(''),
})

export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  rateToUsd: doublePrecision('rate_to_usd').notNull().default(1),   // 1 USD = X 현지화폐
  usdToKrw: doublePrecision('usd_to_krw').notNull().default(0),     // 1 USD = X 원
})

export const incomeRecords = pgTable('income_records', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  date: text('date').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  tithes: doublePrecision('tithes').notNull().default(0),
  sundayOfferings: doublePrecision('sunday_offerings').notNull().default(0),
  thanksgiving: doublePrecision('thanksgiving').notNull().default(0),
  centerSupport: doublePrecision('center_support').notNull().default(0),
  otherOfferings: doublePrecision('other_offerings').notNull().default(0),
  buildingFund: doublePrecision('building_fund').notNull().default(0),
  hqBuildingFund: doublePrecision('hq_building_fund').notNull().default(0),
  otherIncome: doublePrecision('other_income').notNull().default(0),
  currencyType: text('currency_type').notNull().default('usd'),
  paymentMethod: text('payment_method').notNull().default('bank'), // 'bank' | 'cash'
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull().default(''),
})

export const expenseRecords = pgTable('expense_records', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  date: text('date').notNull(),
  accountCode: text('account_code').notNull(),
  accountNameKo: text('account_name_ko').notNull(),
  accountNameRu: text('account_name_ru').notNull(),
  amountUsd: doublePrecision('amount_usd').notNull().default(0),
  amountLocal: doublePrecision('amount_local').notNull().default(0),
  descriptionKo: text('description_ko').notNull().default(''),
  descriptionRu: text('description_ru').notNull().default(''),
  merchantKo: text('merchant_ko').notNull().default(''),
  merchantRu: text('merchant_ru').notNull().default(''),
  managerKo: text('manager_ko').notNull().default(''),
  managerRu: text('manager_ru').notNull().default(''),
  currency: text('currency').notNull().default('USD'),
  paymentMethod: text('payment_method').notNull().default('bank'), // 'bank' | 'cash'
  receiptAttached: boolean('receipt_attached').notNull().default(false),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('draft'),       // 'draft' | 'confirmed'
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(''),
})

export const accountItems = pgTable('account_items', {
  code: text('code').primaryKey(),
  nameKo: text('name_ko').notNull(),
  nameRu: text('name_ru').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull().default(''),
  keywords: text('keywords').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const titheReserves = pgTable('tithe_reserves', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  totalOfferings: doublePrecision('total_offerings').notNull().default(0),
  oneTenth: doublePrecision('one_tenth').notNull().default(0),
  prevBalance: doublePrecision('prev_balance').notNull().default(0),
  remittanceToHq: doublePrecision('remittance_to_hq').notNull().default(0),
  balance: doublePrecision('balance').notNull().default(0),
})

export const deposits = pgTable('deposits', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  category: text('category').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  carriedOver: doublePrecision('carried_over').notNull().default(0),
  increase: doublePrecision('increase').notNull().default(0),
  decrease: doublePrecision('decrease').notNull().default(0),
  balance: doublePrecision('balance').notNull().default(0),
})

export const loans = pgTable('loans', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  carriedOver: doublePrecision('carried_over').notNull().default(0),
  monthlyBorrowing: doublePrecision('monthly_borrowing').notNull().default(0),
  monthlyRepayment: doublePrecision('monthly_repayment').notNull().default(0),
  balance: doublePrecision('balance').notNull().default(0),
  borrowerType: text('borrower_type').notNull().default('member'),
  borrowerName: text('borrower_name').notNull().default(''),
})

// 교회별 이월 시작 잔액 — 시스템 도입 전 잔액을 특정 연월에 설정
export const openingBalances = pgTable('opening_balances', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  bankbookLocal: doublePrecision('bankbook_local').notNull().default(0),  // 통장잔고 — 현지화폐
  cashLocal: doublePrecision('cash_local').notNull().default(0),          // 현금 — 현지화폐
  cashUsd: doublePrecision('cash_usd').notNull().default(0),              // 현금 — 달러
  note: text('note').notNull().default(''),
})

// 자금 이동 — 통장↔현금 내부 이체
export const fundTransfers = pgTable('fund_transfers', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'bank_to_cash' | 'cash_to_bank' | 'cash_to_usd' | 'usd_to_cash'
  amountLocal: doublePrecision('amount_local').notNull().default(0),  // 현지화폐
  amountUsd: doublePrecision('amount_usd').notNull().default(0),      // 달러
  exchangeRate: doublePrecision('exchange_rate').notNull().default(0), // 현지화폐/USD (환전 유형에만 사용)
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull().default(''),
})

// 전역 통화별 월말 환율 (어드민 관리, 교회와 무관)
export const currencyRates = pgTable('currency_rates', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  currencyCode: text('currency_code').notNull(), // USD, RUB, UZS, UAH, KZT
  rateToUsd: doublePrecision('rate_to_usd').notNull().default(0),  // 1 USD = X 통화
  usdToKrw: doublePrecision('usd_to_krw').notNull().default(0),    // 1 USD = X 원
  referenceDate: text('reference_date').notNull().default(''), // 환율 기준일 (YYYY-MM-DD)
})

// 교회별 재정 운영현황보고 설정
export const churchReportConfig = pgTable('church_report_config', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id, { onDelete: 'cascade' }).unique(),
  approvalLimit: doublePrecision('approval_limit').notNull().default(0),  // 담임결재한도
  withdrawer1: text('withdrawer1').notNull().default(''),                 // 출금권한자 구분1
  withdrawer2: text('withdrawer2').notNull().default(''),                 // 출금권한자 구분2
  financialSource: text('financial_source').notNull().default(''),        // 재정출처(통장예금주명)
  checkingStatus: text('checking_status').notNull().default(''),          // 장부확인여부
  feedback: text('feedback').notNull().default(''),                       // 피드백 내용
})

export const receipts = pgTable('receipts', {
  id: serial('id').primaryKey(),
  expenseRecordId: integer('expense_record_id').notNull().references(() => expenseRecords.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  data: text('data').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

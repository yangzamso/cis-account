import { db } from '@/db'
import { incomeRecords, expenseRecords, deposits, loans, churches, openingBalances, fundTransfers, currencyRates } from '@/db/schema'
import { eq, and, like, or, gt, lt, gte, lte, desc } from 'drizzle-orm'

export interface MonthlyReport {
  churchId: number
  year: number
  month: number
  churchNameKo: string
  churchNameRu: string
  currencyCode: string
  exchangeRateToUsd: number  // 1 USD = X 현지화폐 (해당 월 기준, 없으면 직전 기록 사용)
  usdToKrw: number           // 1 USD = X 원
  localToKrw: number         // 1 현지화폐 = X 원 (usdToKrw / rateToUsd)
  rateSourceYear: number     // 환율 출처 연도 (자동채움 시 전월일 수 있음)
  rateSourceMonth: number    // 환율 출처 월
  // section 1 — 총괄현황
  prevBalance: number;      prevBalanceLocal: number;      prevBalanceUsd: number
  monthlyIncome: number;    monthlyIncomeLocal: number;    monthlyIncomeUsd: number
  monthlyExpense: number;   monthlyExpenseLocal: number;   monthlyExpenseUsd: number
  monthlyBalance: number;   monthlyBalanceLocal: number;   monthlyBalanceUsd: number
  accountingBalance: number
  accountingBalanceLocal: number
  accountingBalanceUsd: number
  bankbookBalance: number
  cashBalance: number
  cashLocalBalance: number
  cashUsdBalance: number
  cashUsdRate: number
  // section 4 — 수입내역
  tithes: number;            tithesLocal: number;            tithesUsd: number
  sundayOfferings: number;   sundayOfferingsLocal: number;   sundayOfferingsUsd: number
  thanksgiving: number;      thanksgivingLocal: number;      thanksgivingUsd: number
  otherOfferings: number;    otherOfferingsLocal: number;    otherOfferingsUsd: number
  centerSupport: number;     centerSupportLocal: number;     centerSupportUsd: number
  otherIncome: number;       otherIncomeLocal: number;       otherIncomeUsd: number
  buildingFund: number;      buildingFundLocal: number;      buildingFundUsd: number
  incomeTotal: number;       incomeTotalLocal: number;       incomeTotalUsd: number
  remittanceToHqTribe: number
  // section 5 — 지출내역
  exp01: number; exp01Local: number; exp01Usd: number
  exp02: number; exp02Local: number; exp02Usd: number
  exp03: number; exp03Local: number; exp03Usd: number
  exp04: number; exp04Local: number; exp04Usd: number
  exp05: number; exp05Local: number; exp05Usd: number
  exp06: number; exp06Local: number; exp06Usd: number
  exp07: number; exp07Local: number; exp07Usd: number
  exp08: number; exp08Local: number; exp08Usd: number
  exp09: number; exp09Local: number; exp09Usd: number
  expTotal: number; expTotalLocal: number; expTotalUsd: number
  // 자금이동 요약
  ftBankToCash: number      // 통장 → 현금 (현지화폐)
  ftCashToBank: number      // 현금 → 통장 (현지화폐)
  ftCashToUsdLocal: number  // 현금 → 달러 (현지화폐 지출)
  ftCashToUsdUsd: number    // 현금 → 달러 (달러 취득)
  ftUsdToCashLocal: number  // 달러 → 현금 (현지화폐 취득)
  ftUsdToCashUsd: number    // 달러 → 현금 (달러 지출)
  // 자금현황 페이지용 세부 항목
  prevBankbook: number       // 전월 통장 잔액
  prevCashLocal: number      // 전월 현금(현지화폐) 잔액
  prevCashUsd: number        // 전월 현금(USD) 잔액
  curBankIncomeLocal: number // 이번달 통장 수입
  curCashIncomeLocal: number // 이번달 현금 수입 (현지화폐)
  curBankExp: number         // 이번달 통장 지출
  curCashLocalExp: number    // 이번달 현금 지출 (현지화폐)
  curCashUsdExp: number      // 이번달 현금 지출 (USD)
  // section 3 — 정기예·적금현황
  depositRows: { category: string; carriedOver: number; increase: number; decrease: number; balance: number }[]
  // section 6, 7 — 차입금
  loanCarriedOver: number
  monthlyBorrowing: number
  monthlyRepayment: number
  loanBalance: number
  loanDetailMembers: number
  loanDetailOthers: number
}

export async function buildMonthlyReport(churchId: number, year: number, month: number): Promise<MonthlyReport> {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year

  const datePrefix = `${year}-${String(month).padStart(2, '0')}-%`

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const expenseAmount = (e: { currency: string; amountUsd: number; amountLocal: number }) =>
    e.currency === 'USD' ? (e.amountUsd ?? 0) : (e.amountLocal ?? 0)

  const [churchRows, incomes, expenses, transfers, depositRows, loanRows] = await Promise.all([
    db.select({ nameKo: churches.nameKo, nameRu: churches.nameRu, currencyCode: churches.currencyCode }).from(churches).where(eq(churches.id, churchId)),
    db.select().from(incomeRecords).where(and(eq(incomeRecords.churchId, churchId), eq(incomeRecords.year, year), eq(incomeRecords.month, month))),
    db.select().from(expenseRecords).where(and(eq(expenseRecords.churchId, churchId), like(expenseRecords.date, datePrefix))),
    db.select().from(fundTransfers).where(and(eq(fundTransfers.churchId, churchId), like(fundTransfers.date, datePrefix))),
    db.select().from(deposits).where(and(eq(deposits.churchId, churchId), eq(deposits.year, year), eq(deposits.month, month))),
    db.select().from(loans).where(and(eq(loans.churchId, churchId), eq(loans.year, year), eq(loans.month, month))),
  ])

  // ── 전월이월금 계산 ───────────────────────────────────────────
  const [openingRow] = await db.select()
    .from(openingBalances)
    .where(and(
      eq(openingBalances.churchId, churchId),
      or(
        lt(openingBalances.year, year),
        and(eq(openingBalances.year, year), lte(openingBalances.month, month))
      )
    ))
    .orderBy(desc(openingBalances.year), desc(openingBalances.month))
    .limit(1)

  let prevBalance    = 0
  let prevBankbook   = 0
  let prevCashLocal  = 0
  let prevCashUsd    = 0

  const tLocal = (type: string) => (t: { type: string; amountLocal: number }) => t.type === type ? t.amountLocal : 0
  const tUsd   = (type: string) => (t: { type: string; amountUsd: number })   => t.type === type ? t.amountUsd   : 0

  if (openingRow) {
    const afterOpenNextMonth = openingRow.month === 12 ? 1 : openingRow.month + 1
    const afterOpenNextYear  = openingRow.month === 12 ? openingRow.year + 1 : openingRow.year
    const prevNextMonth      = prevMonth === 12 ? 1 : prevMonth + 1
    const prevNextYear       = prevMonth === 12 ? prevYear + 1 : prevYear
    const openDateBound = `${afterOpenNextYear}-${String(afterOpenNextMonth).padStart(2, '0')}-01`
    const prevDateBound = `${prevNextYear}-${String(prevNextMonth).padStart(2, '0')}-01`

    const [accIncomes, accExpenses, accTransfers] = await Promise.all([
      db.select().from(incomeRecords).where(and(
        eq(incomeRecords.churchId, churchId),
        or(gt(incomeRecords.year, openingRow.year), and(eq(incomeRecords.year, openingRow.year), gt(incomeRecords.month, openingRow.month))),
        or(lt(incomeRecords.year, prevYear), and(eq(incomeRecords.year, prevYear), lte(incomeRecords.month, prevMonth)))
      )),
      db.select().from(expenseRecords).where(and(
        eq(expenseRecords.churchId, churchId),
        gte(expenseRecords.date, openDateBound),
        lt(expenseRecords.date, prevDateBound)
      )),
      db.select().from(fundTransfers).where(and(
        eq(fundTransfers.churchId, churchId),
        gte(fundTransfers.date, openDateBound),
        lt(fundTransfers.date, prevDateBound)
      )),
    ])

    const incomeFields = (r: typeof accIncomes[0]) => r.tithes + r.sundayOfferings + r.thanksgiving + r.centerSupport + r.otherOfferings + r.buildingFund + r.hqBuildingFund + r.otherIncome
    const accBankIncomeLocal = sum(accIncomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod !== 'cash').map(incomeFields))
    const accCashIncomeLocal = sum(accIncomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod === 'cash').map(incomeFields))
    const accIncomeUsd       = sum(accIncomes.filter(r => r.currencyType === 'usd').map(incomeFields))
    const accBankExp      = sum(accExpenses.filter(e => e.paymentMethod !== 'cash').map(expenseAmount))
    const accCashLocalExp = sum(accExpenses.filter(e => e.paymentMethod === 'cash' && e.currency !== 'USD').map(e => e.amountLocal))
    const accCashUsdExp   = sum(accExpenses.filter(e => e.paymentMethod === 'cash' && e.currency === 'USD').map(e => e.amountUsd))

    const accBankToCash     = sum(accTransfers.map(tLocal('bank_to_cash')))
    const accCashToBank     = sum(accTransfers.map(tLocal('cash_to_bank')))
    const accCashToUsdLocal = sum(accTransfers.map(tLocal('cash_to_usd')))
    const accCashToUsdUsd   = sum(accTransfers.map(tUsd('cash_to_usd')))
    const accUsdToCashLocal = sum(accTransfers.map(tLocal('usd_to_cash')))
    const accUsdToCashUsd   = sum(accTransfers.map(tUsd('usd_to_cash')))

    const openBankbook  = openingRow.bankbookLocal ?? 0
    const openCashLocal = openingRow.cashLocal ?? 0
    const openCashUsd   = openingRow.cashUsd ?? 0

    prevBankbook  = openBankbook  + accBankIncomeLocal + accCashToBank - accBankExp - accBankToCash
    prevCashLocal = openCashLocal + accCashIncomeLocal + accBankToCash + accUsdToCashLocal - accCashLocalExp - accCashToBank - accCashToUsdLocal
    prevCashUsd   = openCashUsd   + accIncomeUsd + accCashToUsdUsd - accCashUsdExp - accUsdToCashUsd
    prevBalance   = prevBankbook + prevCashLocal + prevCashUsd
  } else {
    const prevDatePrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}-%`
    const [prevIncomes, prevExpenses, prevTransfers] = await Promise.all([
      db.select().from(incomeRecords).where(and(eq(incomeRecords.churchId, churchId), eq(incomeRecords.year, prevYear), eq(incomeRecords.month, prevMonth))),
      db.select().from(expenseRecords).where(and(eq(expenseRecords.churchId, churchId), like(expenseRecords.date, prevDatePrefix))),
      db.select().from(fundTransfers).where(and(eq(fundTransfers.churchId, churchId), like(fundTransfers.date, prevDatePrefix))),
    ])
    const prevIncomeFields = (r: typeof prevIncomes[0]) => r.tithes + r.sundayOfferings + r.thanksgiving + r.centerSupport + r.otherOfferings + r.buildingFund + r.hqBuildingFund + r.otherIncome
    const prevBankIncomeLocal = sum(prevIncomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod !== 'cash').map(prevIncomeFields))
    const prevCashIncomeLocal = sum(prevIncomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod === 'cash').map(prevIncomeFields))
    const prevIncomeUsd       = sum(prevIncomes.filter(r => r.currencyType === 'usd').map(prevIncomeFields))
    const prevBankExp      = sum(prevExpenses.filter(e => e.paymentMethod !== 'cash').map(expenseAmount))
    const prevCashLocalExp = sum(prevExpenses.filter(e => e.paymentMethod === 'cash' && e.currency !== 'USD').map(e => e.amountLocal))
    const prevCashUsdExp   = sum(prevExpenses.filter(e => e.paymentMethod === 'cash' && e.currency === 'USD').map(e => e.amountUsd))

    const prevBankToCash     = sum(prevTransfers.map(tLocal('bank_to_cash')))
    const prevCashToBank     = sum(prevTransfers.map(tLocal('cash_to_bank')))
    const prevCashToUsdLocal = sum(prevTransfers.map(tLocal('cash_to_usd')))
    const prevCashToUsdUsd   = sum(prevTransfers.map(tUsd('cash_to_usd')))
    const prevUsdToCashLocal = sum(prevTransfers.map(tLocal('usd_to_cash')))
    const prevUsdToCashUsd   = sum(prevTransfers.map(tUsd('usd_to_cash')))

    prevBankbook  = prevBankIncomeLocal + prevCashToBank - prevBankExp - prevBankToCash
    prevCashLocal = prevCashIncomeLocal + prevBankToCash + prevUsdToCashLocal - prevCashLocalExp - prevCashToBank - prevCashToUsdLocal
    prevCashUsd   = prevIncomeUsd + prevCashToUsdUsd - prevCashUsdExp - prevUsdToCashUsd
    prevBalance   = prevBankbook + prevCashLocal + prevCashUsd
  }

  // ── 이번 달 수입 ──────────────────────────────────────────────
  const fieldLocal = <K extends keyof (typeof incomes)[0]>(key: K) =>
    sum(incomes.filter(r => r.currencyType !== 'usd').map(r => r[key] as number))
  const fieldUsd = <K extends keyof (typeof incomes)[0]>(key: K) =>
    sum(incomes.filter(r => r.currencyType === 'usd').map(r => r[key] as number))

  const tithesLocal          = fieldLocal('tithes');          const tithesUsd          = fieldUsd('tithes')
  const sundayOfferingsLocal = fieldLocal('sundayOfferings'); const sundayOfferingsUsd = fieldUsd('sundayOfferings')
  const thanksgivingLocal    = fieldLocal('thanksgiving');    const thanksgivingUsd    = fieldUsd('thanksgiving')
  const otherOfferingsLocal  = fieldLocal('otherOfferings');  const otherOfferingsUsd  = fieldUsd('otherOfferings')
  const centerSupportLocal   = fieldLocal('centerSupport');   const centerSupportUsd   = fieldUsd('centerSupport')
  const otherIncomeLocal     = fieldLocal('otherIncome');     const otherIncomeUsd     = fieldUsd('otherIncome')
  const buildingFundLocal    = fieldLocal('buildingFund') + fieldLocal('hqBuildingFund')
  const buildingFundUsd      = fieldUsd('buildingFund') + fieldUsd('hqBuildingFund')

  const tithes          = tithesLocal + tithesUsd
  const sundayOfferings = sundayOfferingsLocal + sundayOfferingsUsd
  const thanksgiving    = thanksgivingLocal + thanksgivingUsd
  const otherOfferings  = otherOfferingsLocal + otherOfferingsUsd
  const centerSupport   = centerSupportLocal + centerSupportUsd
  const otherIncome     = otherIncomeLocal + otherIncomeUsd
  const buildingFund    = buildingFundLocal + buildingFundUsd

  const incomeTotalLocal = tithesLocal + sundayOfferingsLocal + thanksgivingLocal + otherOfferingsLocal + centerSupportLocal + otherIncomeLocal + buildingFundLocal
  const incomeTotalUsd   = tithesUsd + sundayOfferingsUsd + thanksgivingUsd + otherOfferingsUsd + centerSupportUsd + otherIncomeUsd + buildingFundUsd
  const incomeTotal      = incomeTotalLocal + incomeTotalUsd

  // ── 이번 달 지출 ──────────────────────────────────────────────
  const expMapLocal = new Map<string, number>()
  const expMapUsd   = new Map<string, number>()
  for (const e of expenses) {
    if (e.currency === 'USD') {
      expMapUsd.set(e.accountCode, (expMapUsd.get(e.accountCode) ?? 0) + (e.amountUsd ?? 0))
    } else {
      expMapLocal.set(e.accountCode, (expMapLocal.get(e.accountCode) ?? 0) + (e.amountLocal ?? 0))
    }
  }

  // 십일조비축금 = (십일조 + 주일헌금 + 감사/절기헌금 + 기타헌금) × 10%
  const exp01Local = (tithesLocal + sundayOfferingsLocal + thanksgivingLocal + otherOfferingsLocal) * 0.1
  const exp01Usd   = (tithesUsd + sundayOfferingsUsd + thanksgivingUsd + otherOfferingsUsd) * 0.1
  const exp02Local = expMapLocal.get('EXP-02') ?? 0; const exp02Usd = expMapUsd.get('EXP-02') ?? 0
  const exp03Local = expMapLocal.get('EXP-03') ?? 0; const exp03Usd = expMapUsd.get('EXP-03') ?? 0
  const exp04Local = expMapLocal.get('EXP-04') ?? 0; const exp04Usd = expMapUsd.get('EXP-04') ?? 0
  const exp05Local = expMapLocal.get('EXP-05') ?? 0; const exp05Usd = expMapUsd.get('EXP-05') ?? 0
  const exp06Local = expMapLocal.get('EXP-06') ?? 0; const exp06Usd = expMapUsd.get('EXP-06') ?? 0
  const exp07Local = expMapLocal.get('EXP-07') ?? 0; const exp07Usd = expMapUsd.get('EXP-07') ?? 0
  const exp08Local = expMapLocal.get('EXP-08') ?? 0; const exp08Usd = expMapUsd.get('EXP-08') ?? 0
  const exp09Local = expMapLocal.get('EXP-09') ?? 0; const exp09Usd = expMapUsd.get('EXP-09') ?? 0

  const exp01 = exp01Local + exp01Usd; const exp02 = exp02Local + exp02Usd; const exp03 = exp03Local + exp03Usd
  const exp04 = exp04Local + exp04Usd; const exp05 = exp05Local + exp05Usd; const exp06 = exp06Local + exp06Usd
  const exp07 = exp07Local + exp07Usd; const exp08 = exp08Local + exp08Usd; const exp09 = exp09Local + exp09Usd

  const expTotalLocal = exp01Local + exp02Local + exp03Local + exp04Local + exp05Local + exp06Local + exp07Local + exp08Local + exp09Local
  const expTotalUsd   = exp01Usd + exp02Usd + exp03Usd + exp04Usd + exp05Usd + exp06Usd + exp07Usd + exp08Usd + exp09Usd
  const expTotal      = expTotalLocal + expTotalUsd

  const monthlyIncome       = incomeTotal
  const monthlyIncomeLocal  = incomeTotalLocal
  const monthlyIncomeUsd    = incomeTotalUsd

  // 이번달 수입 — 통장/현금 구분
  const allIncomeFields = (r: typeof incomes[0]) => r.tithes + r.sundayOfferings + r.thanksgiving + r.centerSupport + r.otherOfferings + r.buildingFund + r.hqBuildingFund + r.otherIncome
  const curBankIncomeLocal = sum(incomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod !== 'cash').map(allIncomeFields))
  const curCashIncomeLocal = sum(incomes.filter(r => r.currencyType !== 'usd' && r.paymentMethod === 'cash').map(allIncomeFields))

  const curBankExp          = sum(expenses.filter(e => e.paymentMethod !== 'cash').map(expenseAmount))
  const curCashLocalExp     = sum(expenses.filter(e => e.paymentMethod === 'cash' && e.currency !== 'USD').map(e => e.amountLocal))
  const curCashUsdExp       = sum(expenses.filter(e => e.paymentMethod === 'cash' && e.currency === 'USD').map(e => e.amountUsd))
  const monthlyExpenseLocal = curBankExp + curCashLocalExp
  const monthlyExpenseUsd   = curCashUsdExp
  const monthlyExpense      = monthlyExpenseLocal + monthlyExpenseUsd
  const monthlyBalance      = prevBalance + monthlyIncome - monthlyExpense
  const depositTotal        = sum(depositRows.map(r => r.balance))
  const accountingBalance   = monthlyBalance + depositTotal

  // 이번달 자금이동
  const curBankToCash     = sum(transfers.map(tLocal('bank_to_cash')))
  const curCashToBank     = sum(transfers.map(tLocal('cash_to_bank')))
  const curCashToUsdLocal = sum(transfers.map(tLocal('cash_to_usd')))
  const curCashToUsdUsd   = sum(transfers.map(tUsd('cash_to_usd')))
  const curUsdToCashLocal = sum(transfers.map(tLocal('usd_to_cash')))
  const curUsdToCashUsd   = sum(transfers.map(tUsd('usd_to_cash')))

  // 월말 잔액 — 수입의 통장/현금 구분 반영
  const bankbookBalance  = prevBankbook  + curBankIncomeLocal + curCashToBank - curBankExp - curBankToCash
  const cashLocalBalance = prevCashLocal + curCashIncomeLocal + curBankToCash + curUsdToCashLocal - curCashLocalExp - curCashToBank - curCashToUsdLocal
  const cashUsdBalance   = prevCashUsd   + monthlyIncomeUsd + curCashToUsdUsd - curCashUsdExp - curUsdToCashUsd

  // 섹션 1 통화별 분리
  const prevBalanceLocal       = prevBankbook + prevCashLocal
  const prevBalanceUsd         = prevCashUsd
  const monthlyBalanceLocal    = bankbookBalance + cashLocalBalance
  const monthlyBalanceUsd      = cashUsdBalance
  const accountingBalanceLocal = monthlyBalanceLocal + depositTotal  // 예·적금은 현지화폐 전용
  const accountingBalanceUsd   = monthlyBalanceUsd

  // ── USD 취득 가중평균환율 계산 ────────────────────────────────
  const nextMonthNum   = month === 12 ? 1  : month + 1
  const nextYearNum    = month === 12 ? year + 1 : year
  const nextMonthBound = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01`
  const cashToUsdHistory = await db.select({ amountLocal: fundTransfers.amountLocal, amountUsd: fundTransfers.amountUsd })
    .from(fundTransfers)
    .where(and(eq(fundTransfers.churchId, churchId), eq(fundTransfers.type, 'cash_to_usd'), lt(fundTransfers.date, nextMonthBound)))
  const totalLocalForUsd = sum(cashToUsdHistory.map(t => t.amountLocal))
  const totalUsdAcquired = sum(cashToUsdHistory.map(t => t.amountUsd))
  const cashUsdRate      = totalUsdAcquired > 0 ? totalLocalForUsd / totalUsdAcquired : 0
  const cashBalance      = cashLocalBalance + cashUsdBalance * cashUsdRate

  // ── 차입금 ────────────────────────────────────────────────────
  const loanCarriedOver   = sum(loanRows.map(r => r.carriedOver))
  const monthlyBorrowing  = sum(loanRows.map(r => r.monthlyBorrowing))
  const monthlyRepayment  = sum(loanRows.map(r => r.monthlyRepayment))
  const loanBalance       = sum(loanRows.map(r => r.balance))
  const loanDetailMembers = sum(loanRows.filter(r => r.borrowerType === 'member').map(r => r.balance))
  const loanDetailOthers  = sum(loanRows.filter(r => r.borrowerType === 'other').map(r => r.balance))

  const church = churchRows[0]
  const cc = church?.currencyCode ?? 'USD'

  // ── 환율: currencyRates 글로벌 테이블에서 교회 currencyCode 기준 조회
  //    해당 월 없으면 직전 기록 자동 사용 ────────────────────────────
  let rateRow = await db.select()
    .from(currencyRates)
    .where(and(eq(currencyRates.currencyCode, cc), eq(currencyRates.year, year), eq(currencyRates.month, month)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!rateRow) {
    rateRow = await db.select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.currencyCode, cc),
        or(
          lt(currencyRates.year, year),
          and(eq(currencyRates.year, year), lt(currencyRates.month, month))
        )
      ))
      .orderBy(desc(currencyRates.year), desc(currencyRates.month))
      .limit(1)
      .then(r => r[0] ?? null)
  }

  const exchangeRateToUsd = rateRow?.rateToUsd ?? 0
  const usdToKrw          = rateRow?.usdToKrw ?? 0
  const localToKrw        = exchangeRateToUsd > 0 ? usdToKrw / exchangeRateToUsd : 0
  const rateSourceYear    = rateRow?.year ?? year
  const rateSourceMonth   = rateRow?.month ?? month

  return {
    churchId, year, month,
    churchNameKo: church?.nameKo ?? '',
    churchNameRu: church?.nameRu ?? '',
    currencyCode: church?.currencyCode ?? '',
    exchangeRateToUsd, usdToKrw, localToKrw, rateSourceYear, rateSourceMonth,
    prevBalance, prevBalanceLocal, prevBalanceUsd,
    monthlyIncome, monthlyIncomeLocal, monthlyIncomeUsd,
    monthlyExpense, monthlyExpenseLocal, monthlyExpenseUsd,
    monthlyBalance, monthlyBalanceLocal, monthlyBalanceUsd,
    accountingBalance, accountingBalanceLocal, accountingBalanceUsd,
    ftBankToCash: curBankToCash, ftCashToBank: curCashToBank,
    ftCashToUsdLocal: curCashToUsdLocal, ftCashToUsdUsd: curCashToUsdUsd,
    ftUsdToCashLocal: curUsdToCashLocal, ftUsdToCashUsd: curUsdToCashUsd,
    prevBankbook, prevCashLocal, prevCashUsd,
    curBankIncomeLocal, curCashIncomeLocal,
    curBankExp, curCashLocalExp, curCashUsdExp,
    bankbookBalance, cashBalance, cashLocalBalance, cashUsdBalance, cashUsdRate,
    tithes, tithesLocal, tithesUsd,
    sundayOfferings, sundayOfferingsLocal, sundayOfferingsUsd,
    thanksgiving, thanksgivingLocal, thanksgivingUsd,
    otherOfferings, otherOfferingsLocal, otherOfferingsUsd,
    centerSupport, centerSupportLocal, centerSupportUsd,
    otherIncome, otherIncomeLocal, otherIncomeUsd,
    buildingFund, buildingFundLocal, buildingFundUsd,
    incomeTotal, incomeTotalLocal, incomeTotalUsd,
    remittanceToHqTribe: exp01,
    exp01, exp01Local, exp01Usd,
    exp02, exp02Local, exp02Usd,
    exp03, exp03Local, exp03Usd,
    exp04, exp04Local, exp04Usd,
    exp05, exp05Local, exp05Usd,
    exp06, exp06Local, exp06Usd,
    exp07, exp07Local, exp07Usd,
    exp08, exp08Local, exp08Usd,
    exp09, exp09Local, exp09Usd,
    expTotal, expTotalLocal, expTotalUsd,
    depositRows: depositRows.map(r => ({ category: r.category, carriedOver: r.carriedOver, increase: r.increase, decrease: r.decrease, balance: r.balance })),
    loanCarriedOver, monthlyBorrowing, monthlyRepayment, loanBalance, loanDetailMembers, loanDetailOthers,
  }
}

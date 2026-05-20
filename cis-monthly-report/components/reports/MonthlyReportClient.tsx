'use client'

import { Fragment, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'
import MonthPicker from '../MonthPicker'

interface MonthlyReport {
  year: number
  month: number
  churchNameKo: string
  churchNameRu: string
  currencyCode: string
  exchangeRateToUsd: number
  usdToKrw: number
  localToKrw: number
  rateSourceYear: number
  rateSourceMonth: number
  prevBalance: number;      prevBalanceLocal: number;      prevBalanceUsd: number
  monthlyIncome: number;    monthlyIncomeLocal: number;    monthlyIncomeUsd: number
  monthlyExpense: number;   monthlyExpenseLocal: number;   monthlyExpenseUsd: number
  monthlyBalance: number;   monthlyBalanceLocal: number;   monthlyBalanceUsd: number
  accountingBalance: number
  accountingBalanceLocal: number
  accountingBalanceUsd: number
  ftBankToCash: number
  ftCashToBank: number
  ftCashToUsdLocal: number
  ftCashToUsdUsd: number
  ftUsdToCashLocal: number
  ftUsdToCashUsd: number
  bankbookBalance: number
  cashBalance: number
  cashLocalBalance: number
  cashUsdBalance: number
  cashUsdRate: number
  tithes: number;            tithesLocal: number;            tithesUsd: number
  sundayOfferings: number;   sundayOfferingsLocal: number;   sundayOfferingsUsd: number
  thanksgiving: number;      thanksgivingLocal: number;      thanksgivingUsd: number
  otherOfferings: number;    otherOfferingsLocal: number;    otherOfferingsUsd: number
  centerSupport: number;     centerSupportLocal: number;     centerSupportUsd: number
  otherIncome: number;       otherIncomeLocal: number;       otherIncomeUsd: number
  buildingFund: number;      buildingFundLocal: number;      buildingFundUsd: number
  incomeTotal: number;       incomeTotalLocal: number;       incomeTotalUsd: number
  remittanceToHqTribe: number
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
  depositRows: { category: string; carriedOver: number; increase: number; decrease: number; balance: number }[]
  loanCarriedOver: number
  monthlyBorrowing: number
  monthlyRepayment: number
  loanBalance: number
  loanDetailMembers: number
  loanDetailOthers: number
}

const CURRENCY_UNIT_KO: Record<string, string> = {
  RUB: '루블',
  UZS: '숨',
  UAH: '흐리우냐',
  KZT: '텡게',
}

function fmt(n: number) {
  if (!n || n === 0) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function shincheonjiYear(year: number) { return year - 1983 }

const thCls = 'border border-gray-400 px-1.5 py-1 text-center text-[12px] font-semibold bg-sky-100 leading-tight'
const tdCls = 'border border-gray-400 px-1.5 py-1 text-right text-[12px]'
const tdLCls = 'border border-gray-400 px-1.5 py-1 text-left text-[12px]'
const tdCCls = 'border border-gray-400 px-1.5 py-1 text-center text-[12px]'

function Th({ children, className = '', colSpan = 1, rowSpan = 1 }: { children: React.ReactNode; className?: string; colSpan?: number; rowSpan?: number }) {
  return <th colSpan={colSpan} rowSpan={rowSpan} className={`${thCls} ${className}`}>{children}</th>
}
function Td({ children, className = '', colSpan = 1 }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`${tdCls} ${className}`}>{children}</td>
}
function TdL({ children, className = '', rowSpan = 1 }: { children: React.ReactNode; className?: string; rowSpan?: number }) {
  return <td rowSpan={rowSpan} className={`${tdLCls} ${className}`}>{children}</td>
}
function TdC({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`${tdCCls} ${className}`}>{children}</td>
}
function TdDash({ colSpan = 1 }: { colSpan?: number }) {
  return <td colSpan={colSpan} className={`${tdCCls} text-gray-300`}>-</td>
}
function SectionTitle({ ko, en, showEn }: { ko: string; en: string; showEn?: boolean }) {
  return (
    <div className="mt-5 mb-1">
      <p className="text-[13px] font-bold text-gray-800">{ko}</p>
      {showEn && <p className="text-[12px] text-gray-500 italic">{en}</p>}
    </div>
  )
}

export default function MonthlyReportClient({
  userLang,
  role,
  userChurchId,
}: {
  userLang: 'ko' | 'ru'
  role: 'admin' | 'member'
  userChurchId: number | null
}) {
  const t = useTranslations('monthlyReport')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isRu = locale === 'ru'
  const { churchId: storeChurchId, year, month } = useChurchStore()

  const churchId = role === 'admin' ? storeChurchId : (userChurchId ?? storeChurchId)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [annualReports, setAnnualReports] = useState<MonthlyReport[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!churchId) { setReport(null); setAnnualReports(null); return }
    if (!month) {
      // 전체: 12개월 요약
      setReport(null)
      setLoading(true)
      fetch(`/api/reports/annual?churchId=${churchId}&year=${year}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setAnnualReports(Array.isArray(data) ? data : null))
        .catch(() => setAnnualReports(null))
        .finally(() => setLoading(false))
    } else {
      setAnnualReports(null)
      setLoading(true)
      fetch(`/api/reports/monthly?churchId=${churchId}&year=${year}&month=${month}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setReport(data?.monthlyBalance !== undefined ? data : null))
        .catch(() => setReport(null))
        .finally(() => setLoading(false))
    }
  }, [churchId, year, month])

  async function downloadExcel() {
    if (!churchId) return
    setExporting(true)
    const r = await fetch(`/api/reports/export?churchId=${churchId}&year=${year}&month=${month}`)
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `월말보고서_${year}_${String(month).padStart(2, '0')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) return <p className="text-sm text-gray-400">{tc('loading')}</p>

  // ── 전체 보기 (month === null) ─────────────────────────────────────
  if (!month) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const maxMonth = year === currentYear ? currentMonth : 12

    const first = annualReports?.[0]
    const churchName = first ? (isRu ? first.churchNameRu : first.churchNameKo) : ''
    const cc = first?.currencyCode ?? ''
    const unitLabel = cc && cc !== 'USD' ? (CURRENCY_UNIT_KO[cc] ?? cc) : ''
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">{year}년 총괄현황 (전체)</h2>
        <MonthPicker />
        {!annualReports ? (
          <p className="text-sm text-gray-400">교회를 선택하면 연간 요약이 표시됩니다.</p>
        ) : (
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            {churchName && <p className="text-sm font-bold text-gray-700 mb-3">{churchName}</p>}
            <div className="overflow-x-auto">
              <table className="border-collapse text-[12px]" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <Th rowSpan={2} className="w-10">월</Th>
                    {cc && cc !== 'USD' && <Th rowSpan={2}>환율</Th>}
                    <Th rowSpan={2} className="w-16">통화</Th>
                    <Th>전월이월금</Th>
                    <Th>월입금</Th>
                    <Th>월출금</Th>
                    <Th>월잔액</Th>
                    <Th>회계잔금</Th>
                    <Th>통장잔고</Th>
                    <Th>현금</Th>
                  </tr>
                </thead>
                <tbody>
                  {annualReports.filter(r => r.month <= maxMonth).map((r, i) => {
                    const isCurrentMonth = year === currentYear && r.month === currentMonth
                    const localToKrw = r.localToKrw
                    const rateStr = localToKrw > 0 && unitLabel
                      ? `1${unitLabel}=${localToKrw.toFixed(2)}원`
                      : (r.usdToKrw > 0 ? `1달러=${r.usdToKrw.toFixed(2)}원` : '-')
                    const rowBg = isCurrentMonth ? 'bg-blue-100' : (i % 2 === 0 ? '' : 'bg-gray-50')
                    return (
                      <Fragment key={i}>
                        <tr className={`border-t border-gray-200 ${rowBg}`}>
                          <td rowSpan={2} className={`${tdCCls} font-semibold border-r border-gray-300`}>{r.month}</td>
                          {cc && cc !== 'USD' && (
                            <td rowSpan={2} className={`${tdCCls} text-red-500 text-[11px] border-r border-gray-200 whitespace-nowrap`}>{rateStr}</td>
                          )}
                          <TdL className="border-r border-gray-200 whitespace-nowrap">
                            {cc && cc !== 'USD' ? `현지(${cc})` : 'USD'}
                          </TdL>
                          <Td>{fmt(r.prevBalanceLocal)}</Td>
                          <Td>{fmt(r.monthlyIncomeLocal)}</Td>
                          <Td>{fmt(r.monthlyExpenseLocal)}</Td>
                          <Td>{fmt(r.monthlyBalanceLocal)}</Td>
                          <Td className="bg-amber-50 font-semibold">{fmt(r.accountingBalanceLocal)}</Td>
                          <Td>{fmt(r.bankbookBalance)}</Td>
                          <Td>{fmt(r.cashLocalBalance)}</Td>
                        </tr>
                        <tr className={rowBg}>
                          <TdL className="border-r border-gray-200">USD</TdL>
                          <Td>{fmt(r.prevBalanceUsd)}</Td>
                          <Td>{fmt(r.monthlyIncomeUsd)}</Td>
                          <Td>{fmt(r.monthlyExpenseUsd)}</Td>
                          <Td>{fmt(r.monthlyBalanceUsd)}</Td>
                          <Td className="bg-amber-50 font-semibold">{fmt(r.accountingBalanceUsd)}</Td>
                          <TdDash />
                          <Td>{fmt(r.cashUsdBalance)}</Td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!report) return (
    <div className="space-y-4">
      <MonthPicker />
    </div>
  )

  const churchName = isRu ? report.churchNameRu : report.churchNameKo
  const scYear = shincheonjiYear(report.year)

  const pageTitle = month ? `${t('title')} - ${year}년 ${month}월` : t('title')

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{pageTitle}</h2>
      {/* 상단 툴바 */}
      <div className="flex items-center gap-3">
        <MonthPicker />
        <button
          onClick={downloadExcel}
          disabled={exporting}
          className="ml-auto px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? tc('loading') : '엑셀 다운로드'}
        </button>
      </div>

      {/* 보고서 본문 */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-2 text-[12px]">

        {/* ===== 제목 ===== */}
        <div className="text-center space-y-0.5 mb-4">
          <p className="text-sm font-bold">{churchName} 재정부 월말보고서</p>
          {isRu && <p className="text-[13px] text-gray-600">{report.churchNameRu} Department of Finance End-of-Month Report</p>}
          <p className="text-[13px]">
            신천기 {scYear}년 {report.month}월 &nbsp;/&nbsp; {report.year}년 {report.month}월
            {isRu && <span className="text-gray-500"> &nbsp;Shincheonji Year {scYear} ({report.year}) {report.month}(Month)</span>}
          </p>
        </div>

        {/* ===== 1. 총괄현황 ===== */}
        {report.currencyCode && report.currencyCode !== 'USD' && (
          <p className="text-[12px] text-red-600 font-semibold mb-1">
            {report.localToKrw > 0
              ? `화폐단위 : 1${CURRENCY_UNIT_KO[report.currencyCode] ?? report.currencyCode}=${report.localToKrw.toFixed(2)}원${report.currencyCode === 'UZS' && report.usdToKrw > 0 ? ` / 1달러=${report.usdToKrw.toFixed(2)}원` : ''}`
              : '- 환율 정보 없음'}
          </p>
        )}
        <SectionTitle ko="1. 총괄현황" en="General Overview" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-16">통화{isRu && <><br /><span className="font-normal text-gray-500">Currency</span></>}</Th>
                <Th>전월이월금{isRu && <><br /><span className="font-normal text-gray-500">Prev. Balance</span></>}</Th>
                <Th>월입금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Income</span></>}</Th>
                <Th>월출금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Expenditure</span></>}</Th>
                <Th>월잔액{isRu && <><br /><span className="font-normal text-gray-500">Monthly Balance</span></>}</Th>
                <Th>회계잔금{isRu && <><br /><span className="font-normal text-gray-500">Accounting Balance</span></>}</Th>
                <Th>통장잔고{isRu && <><br /><span className="font-normal text-gray-500">Bankbook</span></>}</Th>
                <Th>현금{isRu && <><br /><span className="font-normal text-gray-500">Cash</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TdL>현지화폐</TdL>
                <Td>{fmt(report.prevBalanceLocal)}</Td>
                <Td>{fmt(report.monthlyIncomeLocal)}</Td>
                <Td>{fmt(report.monthlyExpenseLocal)}</Td>
                <Td>{fmt(report.monthlyBalanceLocal)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.accountingBalanceLocal)}</Td>
                <Td>{fmt(report.bankbookBalance)}</Td>
                <Td>{fmt(report.cashLocalBalance)}</Td>
              </tr>
              <tr>
                <TdL>USD</TdL>
                <Td>{fmt(report.prevBalanceUsd)}</Td>
                <Td>{fmt(report.monthlyIncomeUsd)}</Td>
                <Td>{fmt(report.monthlyExpenseUsd)}</Td>
                <Td>{fmt(report.monthlyBalanceUsd)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.accountingBalanceUsd)}</Td>
                <TdDash />
                <Td>
                  <div>{fmt(report.cashUsdBalance)}</div>
                  {report.cashUsdBalance > 0 && report.cashUsdRate > 0 && (
                    <div className="text-purple-400 text-[11px] mt-0.5">
                      1 USD ≈ {report.cashUsdRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </Td>
              </tr>
            </tbody>
          </table>
        </div>

        {(report.ftBankToCash > 0 || report.ftCashToBank > 0 || report.ftCashToUsdUsd > 0 || report.ftUsdToCashUsd > 0) && (
          <div className="mt-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded text-[13px] text-gray-600 leading-relaxed space-y-1">
            <p className="text-gray-500">※ 자금 이동 된 금액은 월출금·월잔액에 반영되지 않아 금액이 맞지 않아 보일 수 있습니다.</p>
            {report.ftBankToCash > 0 && (
              <p>• 통장 → 현금 : <strong>{fmt(report.ftBankToCash)}</strong> 이동</p>
            )}
            {report.ftCashToBank > 0 && (
              <p>• 현금 → 통장 : <strong>{fmt(report.ftCashToBank)}</strong> 이동</p>
            )}
            {report.ftCashToUsdUsd > 0 && (
              <p>• 현금 중에서 달러로 전환 : <strong>{fmt(report.ftCashToUsdLocal)}</strong> → <strong className="text-blue-600">${fmt(report.ftCashToUsdUsd)}</strong>
                {report.ftCashToUsdUsd > 0 && (
                  <span className="text-gray-400"> (1 USD = {Math.round(report.ftCashToUsdLocal / report.ftCashToUsdUsd).toLocaleString()})</span>
                )}
              </p>
            )}
            {report.ftUsdToCashUsd > 0 && (
              <p>• 달러 중에서 현금으로 전환 : <strong className="text-blue-600">${fmt(report.ftUsdToCashUsd)}</strong> → <strong>{fmt(report.ftUsdToCashLocal)}</strong>
                {report.ftUsdToCashLocal > 0 && (
                  <span className="text-gray-400"> (1 USD = {Math.round(report.ftUsdToCashLocal / report.ftUsdToCashUsd).toLocaleString()})</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* ===== 2. 각 부서별 재정현황 ===== */}
        <SectionTitle ko="2. 각 부서별 재정현황" en="Financial Status by Department" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-16">통화{isRu && <><br /><span className="font-normal text-gray-500">Currency</span></>}</Th>
                <Th rowSpan={2}>부서명{isRu && <><br /><span className="font-normal text-gray-500">Department</span></>}</Th>
                <Th>전월이월금{isRu && <><br /><span className="font-normal text-gray-500">Prev. Balance</span></>}</Th>
                <Th>월입금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Income</span></>}</Th>
                <Th>월출금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Expenditure</span></>}</Th>
                <Th>월잔액{isRu && <><br /><span className="font-normal text-gray-500">Monthly Balance</span></>}</Th>
                <Th>회계잔금{isRu && <><br /><span className="font-normal text-gray-500">Accounting Balance<br />(정기예적금 포함)</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TdL>현지화폐</TdL>
                <TdL rowSpan={2}>재정부</TdL>
                <Td>{fmt(report.prevBalanceLocal)}</Td>
                <Td>{fmt(report.monthlyIncomeLocal)}</Td>
                <Td>{fmt(report.monthlyExpenseLocal)}</Td>
                <Td>{fmt(report.monthlyBalanceLocal)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.accountingBalanceLocal)}</Td>
              </tr>
              <tr>
                <TdL>USD</TdL>
                <Td>{fmt(report.prevBalanceUsd)}</Td>
                <Td>{fmt(report.monthlyIncomeUsd)}</Td>
                <Td>{fmt(report.monthlyExpenseUsd)}</Td>
                <Td>{fmt(report.monthlyBalanceUsd)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.accountingBalanceUsd)}</Td>
              </tr>
              <tr className="bg-amber-50">
                <TdL>현지화폐</TdL>
                <TdL className="font-semibold" rowSpan={2}>합계</TdL>
                <Td className="font-semibold">{fmt(report.prevBalanceLocal)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyIncomeLocal)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyExpenseLocal)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyBalanceLocal)}</Td>
                <Td className="font-semibold">{fmt(report.accountingBalanceLocal)}</Td>
              </tr>
              <tr className="bg-amber-50">
                <TdL>USD</TdL>
                <Td className="font-semibold">{fmt(report.prevBalanceUsd)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyIncomeUsd)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyExpenseUsd)}</Td>
                <Td className="font-semibold">{fmt(report.monthlyBalanceUsd)}</Td>
                <Td className="font-semibold">{fmt(report.accountingBalanceUsd)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 3. 정기예·적금현황 ===== */}
        <SectionTitle ko="3. 정기예·적금현황" en="Status of Deposits and Time Deposits" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>구분{isRu && <><br /><span className="font-normal text-gray-500">Category</span></>}</Th>
                <Th>이월금{isRu && <><br /><span className="font-normal text-gray-500">Carried-Over Amount</span></>}</Th>
                <Th>증가{isRu && <><br /><span className="font-normal text-gray-500">Increase</span></>}</Th>
                <Th>감소{isRu && <><br /><span className="font-normal text-gray-500">Decrease</span></>}</Th>
                <Th>잔액{isRu && <><br /><span className="font-normal text-gray-500">Balance</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              {report.depositRows.length === 0 ? (
                <tr><td colSpan={5} className={`${tdCCls} text-gray-400`}>데이터 없음</td></tr>
              ) : report.depositRows.map((d, i) => (
                <tr key={i}>
                  <TdL>{d.category}</TdL>
                  <Td>{fmt(d.carriedOver)}</Td>
                  <Td>{fmt(d.increase)}</Td>
                  <Td>{fmt(d.decrease)}</Td>
                  <Td>{fmt(d.balance)}</Td>
                </tr>
              ))}
              {report.depositRows.length > 0 && (
                <tr className="bg-amber-50">
                  <TdL className="font-semibold">합계</TdL>
                  <Td className="font-semibold">{fmt(report.depositRows.reduce((s,d)=>s+d.carriedOver,0))}</Td>
                  <Td className="font-semibold">{fmt(report.depositRows.reduce((s,d)=>s+d.increase,0))}</Td>
                  <Td className="font-semibold">{fmt(report.depositRows.reduce((s,d)=>s+d.decrease,0))}</Td>
                  <Td className="font-semibold">{fmt(report.depositRows.reduce((s,d)=>s+d.balance,0))}</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ===== 4. 일반재정 수입내역 ===== */}
        <SectionTitle ko="4. 일반재정 수입내역" en="General Fund Income Details" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-16">통화{isRu && <><br /><span className="font-normal text-gray-500">Currency</span></>}</Th>
                <Th>십일조{isRu && <><br /><span className="font-normal text-gray-500">Tithes</span></>}</Th>
                <Th>주일헌금{isRu && <><br /><span className="font-normal text-gray-500">Sunday Offerings</span></>}</Th>
                <Th>감사·절기헌금{isRu && <><br /><span className="font-normal text-gray-500">Thanksgiving &amp; Special</span></>}</Th>
                <Th>기타헌금{isRu && <><br /><span className="font-normal text-gray-500">Other Offerings</span></>}</Th>
                <Th>센터후원금{isRu && <><br /><span className="font-normal text-gray-500">Center Support</span></>}</Th>
                <Th>기타입금{isRu && <><br /><span className="font-normal text-gray-500">Other Income</span></>}</Th>
                <Th>건축헌금{isRu && <><br /><span className="font-normal text-gray-500">Building Fund</span></>}</Th>
                <Th className="bg-amber-100">합 계{isRu && <><br /><span className="font-normal text-gray-500">Total</span></>}</Th>
                <Th className="bg-orange-100">총회·지파로 보낸헌금{isRu && <><br /><span className="font-normal text-gray-500">Remittance to HQ/Tribe</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TdL>현지화폐</TdL>
                <Td>{fmt(report.tithesLocal)}</Td>
                <Td>{fmt(report.sundayOfferingsLocal)}</Td>
                <Td>{fmt(report.thanksgivingLocal)}</Td>
                <Td>{fmt(report.otherOfferingsLocal)}</Td>
                <Td>{fmt(report.centerSupportLocal)}</Td>
                <Td>{fmt(report.otherIncomeLocal)}</Td>
                <Td>{fmt(report.buildingFundLocal)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.incomeTotalLocal)}</Td>
                <Td className="bg-orange-50">{fmt(report.exp01Local)}</Td>
              </tr>
              <tr>
                <TdL>USD</TdL>
                <Td>{fmt(report.tithesUsd)}</Td>
                <Td>{fmt(report.sundayOfferingsUsd)}</Td>
                <Td>{fmt(report.thanksgivingUsd)}</Td>
                <Td>{fmt(report.otherOfferingsUsd)}</Td>
                <Td>{fmt(report.centerSupportUsd)}</Td>
                <Td>{fmt(report.otherIncomeUsd)}</Td>
                <Td>{fmt(report.buildingFundUsd)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.incomeTotalUsd)}</Td>
                <Td className="bg-orange-50">{fmt(report.exp01Usd)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 5. 일반재정 지출내역 ===== */}
        <SectionTitle ko="5. 일반재정 지출내역" en="General Fund Expenditure Details" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-16">통화{isRu && <><br /><span className="font-normal text-gray-500">Currency</span></>}</Th>
                <Th className="max-w-[70px]">십일조비축금<br />(총회·지파로<br />보낸헌금){isRu && <><br /><span className="font-normal text-gray-500">Tithe Reserve</span></>}</Th>
                <Th>선교비{isRu && <><br /><span className="font-normal text-gray-500">Mission Expenses</span></>}</Th>
                <Th>교회생활비{isRu && <><br /><span className="font-normal text-gray-500">Church Living</span></>}</Th>
                <Th>여비교통비·후생비{isRu && <><br /><span className="font-normal text-gray-500">Travel &amp; Welfare</span></>}</Th>
                <Th>관리행정비{isRu && <><br /><span className="font-normal text-gray-500">Administrative</span></>}</Th>
                <Th>임차공과비{isRu && <><br /><span className="font-normal text-gray-500">Rental &amp; Utility</span></>}</Th>
                <Th>차량유지비{isRu && <><br /><span className="font-normal text-gray-500">Vehicle</span></>}</Th>
                <Th>각종지출비{isRu && <><br /><span className="font-normal text-gray-500">Miscellaneous</span></>}</Th>
                <Th>자산부채관련{isRu && <><br /><span className="font-normal text-gray-500">Assets &amp; Liabilities</span></>}</Th>
                <Th className="bg-amber-100">합 계{isRu && <><br /><span className="font-normal text-gray-500">Total</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TdL>현지화폐</TdL>
                <Td>{fmt(report.exp01Local)}</Td>
                <Td>{fmt(report.exp02Local)}</Td>
                <Td>{fmt(report.exp03Local)}</Td>
                <Td>{fmt(report.exp04Local)}</Td>
                <Td>{fmt(report.exp05Local)}</Td>
                <Td>{fmt(report.exp06Local)}</Td>
                <Td>{fmt(report.exp07Local)}</Td>
                <Td>{fmt(report.exp08Local)}</Td>
                <Td>{fmt(report.exp09Local)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.expTotalLocal)}</Td>
              </tr>
              <tr>
                <TdL>USD</TdL>
                <Td>{fmt(report.exp01Usd)}</Td>
                <Td>{fmt(report.exp02Usd)}</Td>
                <Td>{fmt(report.exp03Usd)}</Td>
                <Td>{fmt(report.exp04Usd)}</Td>
                <Td>{fmt(report.exp05Usd)}</Td>
                <Td>{fmt(report.exp06Usd)}</Td>
                <Td>{fmt(report.exp07Usd)}</Td>
                <Td>{fmt(report.exp08Usd)}</Td>
                <Td>{fmt(report.exp09Usd)}</Td>
                <Td className="bg-amber-50 font-semibold">{fmt(report.expTotalUsd)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 6. 차입금 ===== */}
        <SectionTitle ko="6. 차입금" en="Loans" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>이월금{isRu && <><br /><span className="font-normal text-gray-500">Carried-Over Amount</span></>}</Th>
                <Th>월 차입금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Borrowings</span></>}</Th>
                <Th>월 상환금{isRu && <><br /><span className="font-normal text-gray-500">Monthly Repayments</span></>}</Th>
                <Th>차입잔금{isRu && <><br /><span className="font-normal text-gray-500">Loan Balance</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>{fmt(report.loanCarriedOver)}</Td>
                <Td>{fmt(report.monthlyBorrowing)}</Td>
                <Td>{fmt(report.monthlyRepayment)}</Td>
                <Td>{fmt(report.loanBalance)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 7. 차입잔금내역 ===== */}
        <SectionTitle ko="7. 차입잔금내역" en="Loan Balance Details" showEn={isRu} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>상도 (성도){isRu && <><br /><span className="font-normal text-gray-500">Members</span></>}</Th>
                <Th>기 타{isRu && <><br /><span className="font-normal text-gray-500">Others</span></>}</Th>
                <Th>합 계{isRu && <><br /><span className="font-normal text-gray-500">Total</span></>}</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>{fmt(report.loanDetailMembers)}</Td>
                <Td>{fmt(report.loanDetailOthers)}</Td>
                <Td className="font-semibold">{fmt(report.loanBalance)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 푸터 ===== */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center space-y-1.5">
          <p className="text-[13px]">
            위와 같이 보고합니다.
            {isRu && <span className="text-gray-500"> As reported above.</span>}
          </p>
          <p className="text-[13px]">
            신천기 {scYear}년 {report.month}월 &nbsp;/&nbsp; {report.year}년 {report.month}월
            {isRu && <span className="text-gray-500"> &nbsp;Shincheonji Year {scYear} ({report.year}), {report.month} (Month)</span>}
          </p>
          <p className="text-[13px]">
            보고자 : 재정부장 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {isRu && <span className="text-gray-500">Reported by: General Director, Department of Finance</span>}
          </p>
        </div>

      </div>
    </div>
  )
}

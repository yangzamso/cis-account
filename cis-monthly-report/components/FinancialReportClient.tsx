'use client'

import { Fragment, useEffect, useState } from 'react'
import { useChurchStore } from '@/lib/store'
import MonthPicker from './MonthPicker'

interface ReportRow {
  churchId: number
  churchNumber: number | null
  churchNameKo: string
  currencyCode: string
  localToKrw: number
  usdToKrw: number
  // 자국통화
  prevBalanceLocal: number
  prevBalanceUsd: number
  monthlyIncomeLocal: number
  monthlyIncomeUsd: number
  monthlyExpenseLocal: number
  monthlyExpenseUsd: number
  monthlyBalanceLocal: number
  monthlyBalanceUsd: number
  accountingBalanceLocal: number
  accountingBalanceUsd: number
  bankbookBalance: number
  cashLocalBalance: number
  cashUsdBalance: number
  // 설정
  approvalLimit: number
  withdrawer1: string
  withdrawer2: string
  financialSource: string
  checkingStatus: string
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function lastDayOf(year: number, month: number) {
  return new Date(year, month, 0)
}

function fmtN(n: number) {
  if (!n) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtKrw(n: number) {
  if (!n) return '-'
  return Math.round(n).toLocaleString('en-US')
}

const thCls = 'border border-gray-400 px-1.5 py-1 text-center text-[11px] font-semibold bg-yellow-100 whitespace-pre-line leading-tight'
const tdCls = 'border border-gray-300 px-1.5 py-1 text-right text-[11px] whitespace-nowrap'
const tdLCls = 'border border-gray-300 px-1.5 py-1 text-left text-[11px] whitespace-nowrap'
const tdCCls = 'border border-gray-300 px-1.5 py-1 text-center text-[11px]'

export default function FinancialReportClient() {
  const { year, month } = useChurchStore()
  const [rows, setRows]     = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!month) { setRows([]); return }
    setLoading(true)
    fetch(`/api/financial-report?year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [year, month])

  const d = month ? lastDayOf(year, month) : null

  // 자국통화 합계
  const sumLocal = (key: keyof ReportRow) =>
    rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)

  // USD 교회는 local + usd 합산 (자국통화 = USD이므로)
  const loc = (r: ReportRow, local: number, usd: number) =>
    r.currencyCode === 'USD' ? local + usd : local

  // 원화 환산 헬퍼
  const toKrw = (r: ReportRow) => ({
    prevBalance:       r.prevBalanceLocal * r.localToKrw + r.prevBalanceUsd * r.usdToKrw,
    monthlyIncome:     r.monthlyIncomeLocal * r.localToKrw,
    monthlyExpense:    r.monthlyExpenseLocal * r.localToKrw,
    monthlyBalance:    r.monthlyBalanceLocal * r.localToKrw + r.cashUsdBalance * r.usdToKrw,
    accountingBalance: r.accountingBalanceLocal * r.localToKrw + r.cashUsdBalance * r.usdToKrw,
    bankbook:          r.bankbookBalance * r.localToKrw,
    cash:              r.cashLocalBalance * r.localToKrw + r.cashUsdBalance * r.usdToKrw,
  })

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="text-center space-y-0.5">
        <h2 className="text-base font-bold text-gray-900">CIS 해외교회(지역) 재정 운영현황 보고</h2>
        {d && (
          <p className="text-sm text-gray-700">
            {year}년 {month}월 {d.getDate()}일 ({DAY_KO[d.getDay()]})
          </p>
        )}
      </div>

      <MonthPicker />

      {!month ? (
        <p className="text-sm text-gray-400">월을 선택하면 보고서가 표시됩니다.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400">로딩 중...</p>
      ) : (
        <>
          {/* ===== 자국통화 기준 ===== */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-2 px-1 border-l-4 border-blue-500 pl-2">
              자국통화 기준
            </h3>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[11px]" style={{ tableLayout: 'fixed', width: 922 }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 60 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={thCls}>번호</th>
                    <th className={thCls}>교회</th>
                    <th className={thCls}>화폐단위</th>
                    <th className={thCls}>전월이월금</th>
                    <th className={thCls}>월입금</th>
                    <th className={thCls}>월출금</th>
                    <th className={thCls}>잔액</th>
                    <th className={thCls}>회계잔액</th>
                    <th className={thCls}>통장잔고</th>
                    <th className={thCls}>현금</th>
                    <th className={thCls}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const hasUsd = r.currencyCode !== 'USD' &&
                      (r.prevBalanceUsd !== 0 || r.monthlyIncomeUsd !== 0 || r.monthlyExpenseUsd !== 0 || r.cashUsdBalance !== 0)
                    const bg = i % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                    const allNums = [
                      loc(r, r.prevBalanceLocal, r.prevBalanceUsd),
                      loc(r, r.monthlyIncomeLocal, r.monthlyIncomeUsd),
                      loc(r, r.monthlyExpenseLocal, r.monthlyExpenseUsd),
                      loc(r, r.monthlyBalanceLocal, r.monthlyBalanceUsd),
                      loc(r, r.accountingBalanceLocal, r.accountingBalanceUsd),
                      r.bankbookBalance,
                      loc(r, r.cashLocalBalance, r.cashUsdBalance),
                    ]
                    const hasDecimal = allNums.some(n => n !== 0 && Math.floor(n) !== n)
                    return (
                      <Fragment key={r.churchId}>
                        <tr className={bg}>
                          <td className={tdCCls} rowSpan={hasUsd ? 2 : 1}>{r.churchNumber ?? '-'}</td>
                          <td className={tdLCls} rowSpan={hasUsd ? 2 : 1}>{r.churchNameKo}</td>
                          <td className={tdCCls}>{r.localToKrw > 0 ? `1${getCurrencyUnit(r.currencyCode)} = ${r.localToKrw.toFixed(2)}` : r.currencyCode}</td>
                          <td className={tdCls}>{fmtN(loc(r, r.prevBalanceLocal, r.prevBalanceUsd))}</td>
                          <td className={tdCls}>{fmtN(loc(r, r.monthlyIncomeLocal, r.monthlyIncomeUsd))}</td>
                          <td className={tdCls}>{fmtN(loc(r, r.monthlyExpenseLocal, r.monthlyExpenseUsd))}</td>
                          <td className={tdCls}>{fmtN(loc(r, r.monthlyBalanceLocal, r.monthlyBalanceUsd))}</td>
                          <td className={`${tdCls} font-semibold bg-amber-50`}>{fmtN(loc(r, r.accountingBalanceLocal, r.accountingBalanceUsd))}</td>
                          <td className={tdCls}>{fmtN(r.bankbookBalance)}</td>
                          <td className={tdCls}>{fmtN(loc(r, r.cashLocalBalance, r.cashUsdBalance))}</td>
                          <td className={tdCCls} rowSpan={hasUsd ? 2 : 1}>
                            {hasDecimal && (
                              <span className="inline-block bg-orange-100 text-orange-700 border border-orange-300 rounded px-1 py-0.5 text-[10px] font-medium leading-tight whitespace-nowrap">
                                소수점
                              </span>
                            )}
                          </td>
                        </tr>
                        {hasUsd && (
                          <tr className={bg}>
                            <td className={tdCCls}>{r.usdToKrw > 0 ? `1달러 = ${r.usdToKrw.toFixed(2)}` : '1달러'}</td>
                            <td className={tdCls}>{fmtN(r.prevBalanceUsd)}</td>
                            <td className={tdCls}>{fmtN(r.monthlyIncomeUsd)}</td>
                            <td className={tdCls}>{fmtN(r.monthlyExpenseUsd)}</td>
                            <td className={tdCls}>{fmtN(r.monthlyBalanceUsd)}</td>
                            <td className={`${tdCls} bg-amber-50`}>{fmtN(r.accountingBalanceUsd)}</td>
                            <td className={tdCls}></td>
                            <td className={tdCls}>{fmtN(r.cashUsdBalance)}</td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {/* 합계 */}
                  <tr className="bg-yellow-50 font-semibold">
                    <td className={tdCCls} colSpan={3}>합 계</td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                    <td className={tdCls}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== 한국원화 기준 ===== */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-2 border-l-4 border-emerald-500 pl-2">
              한국원화 기준
            </h3>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[11px]" style={{ tableLayout: 'fixed', width: 922 }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 60 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={thCls}>번호</th>
                    <th className={thCls}>교회</th>
                    <th className={thCls}>화폐단위</th>
                    <th className={thCls}>{'전월이월금\n(원화)'}</th>
                    <th className={thCls}>{'월입금\n(원화)'}</th>
                    <th className={thCls}>{'월출금\n(원화)'}</th>
                    <th className={thCls}>{'잔액\n(원화)'}</th>
                    <th className={thCls}>{'회계잔액\n(원화)'}</th>
                    <th className={thCls}>{'통장잔고\n(원화)'}</th>
                    <th className={thCls}>{'현금\n(원화)'}</th>
                    <th className={thCls}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const hasUsd = r.currencyCode !== 'USD' &&
                      (r.prevBalanceUsd !== 0 || r.monthlyIncomeUsd !== 0 || r.monthlyExpenseUsd !== 0 || r.cashUsdBalance !== 0)
                    const bg = i % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                    return (
                      <Fragment key={r.churchId}>
                        <tr className={bg}>
                          <td className={tdCCls} rowSpan={hasUsd ? 2 : 1}>{r.churchNumber ?? '-'}</td>
                          <td className={tdLCls} rowSpan={hasUsd ? 2 : 1}>{r.churchNameKo}</td>
                          <td className={tdCCls}>{r.localToKrw > 0 ? `1${getCurrencyUnit(r.currencyCode)} = ${r.localToKrw.toFixed(2)}` : r.currencyCode}</td>
                          <td className={tdCls}>{fmtKrw(loc(r, r.prevBalanceLocal, r.prevBalanceUsd) * r.localToKrw)}</td>
                          <td className={tdCls}>{fmtKrw(loc(r, r.monthlyIncomeLocal, r.monthlyIncomeUsd) * r.localToKrw)}</td>
                          <td className={tdCls}>{fmtKrw(loc(r, r.monthlyExpenseLocal, r.monthlyExpenseUsd) * r.localToKrw)}</td>
                          <td className={tdCls}>{fmtKrw(loc(r, r.monthlyBalanceLocal, r.monthlyBalanceUsd) * r.localToKrw)}</td>
                          <td className={`${tdCls} font-semibold bg-amber-50`}>{fmtKrw(loc(r, r.accountingBalanceLocal, r.accountingBalanceUsd) * r.localToKrw)}</td>
                          <td className={tdCls}>{fmtKrw(r.bankbookBalance * r.localToKrw)}</td>
                          <td className={tdCls}>{fmtKrw(loc(r, r.cashLocalBalance, r.cashUsdBalance) * r.localToKrw)}</td>
                          <td className={tdCCls} rowSpan={hasUsd ? 2 : 1}></td>
                        </tr>
                        {hasUsd && (
                          <tr className={bg}>
                            <td className={tdCCls}>{r.usdToKrw > 0 ? `1달러 = ${r.usdToKrw.toFixed(2)}` : '1달러'}</td>
                            <td className={tdCls}>{fmtKrw(r.prevBalanceUsd * r.usdToKrw)}</td>
                            <td className={tdCls}>{fmtKrw(r.monthlyIncomeUsd * r.usdToKrw)}</td>
                            <td className={tdCls}>{fmtKrw(r.monthlyExpenseUsd * r.usdToKrw)}</td>
                            <td className={tdCls}>{fmtKrw(r.monthlyBalanceUsd * r.usdToKrw)}</td>
                            <td className={`${tdCls} bg-amber-50`}>{fmtKrw(r.accountingBalanceUsd * r.usdToKrw)}</td>
                            <td className={tdCls}></td>
                            <td className={tdCls}>{fmtKrw(r.cashUsdBalance * r.usdToKrw)}</td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {/* 합계 */}
                  <tr className="bg-yellow-50 font-semibold">
                    <td className={tdCCls} colSpan={3}>합 계</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).prevBalance, 0))}</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).monthlyIncome, 0))}</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).monthlyExpense, 0))}</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).monthlyBalance, 0))}</td>
                    <td className={`${tdCls} bg-amber-100`}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).accountingBalance, 0))}</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).bankbook, 0))}</td>
                    <td className={tdCls}>{fmtKrw(rows.reduce((s, r) => s + toKrw(r).cash, 0))}</td>
                    <td className={tdCls}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== 재정 운영 설정 ===== */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-2 border-l-4 border-violet-500 pl-2">
              재정 운영 설정
            </h3>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[11px]">
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 80 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={thCls} rowSpan={2}>번호</th>
                    <th className={thCls} rowSpan={2}>교회</th>
                    <th className={thCls} rowSpan={2}>담임결재한도</th>
                    <th className={thCls} colSpan={2}>출금권한자</th>
                    <th className={thCls} rowSpan={2}>재정출처{'\n'}(통장예금주명)</th>
                    <th className={thCls} rowSpan={2}>장부·통장잔액{'\n'}확인여부</th>
                  </tr>
                  <tr>
                    <th className={thCls}>구분1</th>
                    <th className={thCls}>구분2</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.churchId} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                      <td className={tdCCls}>{r.churchNumber ?? '-'}</td>
                      <td className={tdLCls}>{r.churchNameKo}</td>
                      <td className={tdCls}>{r.approvalLimit ? r.approvalLimit.toLocaleString('en-US') : '-'}</td>
                      <td className={tdCCls}>{r.withdrawer1}</td>
                      <td className={tdCCls}>{r.withdrawer2}</td>
                      <td className={tdCCls}>{r.financialSource}</td>
                      <td className={tdCCls}>{r.checkingStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const CURRENCY_UNIT: Record<string, string> = {
  RUB: '루블', KZT: '텡게', UZS: '숨', UAH: '흐리우냐', USD: '달러',
}
function getCurrencyUnit(cc: string) {
  return CURRENCY_UNIT[cc] ?? cc
}

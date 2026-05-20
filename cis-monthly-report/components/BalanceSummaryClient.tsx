'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'
import MonthPicker from './MonthPicker'
import type { MonthlyReport } from '@/lib/report-builder'

interface Props {
  isAdmin: boolean
  userChurchId: number | null
  churchCurrencyCode: string
}

function AmtCell({ value, highlight }: { value: number; highlight?: boolean }) {
  const isNeg = value < 0
  return (
    <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${
      highlight ? 'font-semibold text-gray-800' : isNeg ? 'text-red-500' : 'text-gray-700'
    }`}>
      {value === 0 ? <span className="text-gray-300">—</span>
        : isNeg
          ? `(${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})`
          : value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      }
    </td>
  )
}

function SignedAmtCell({ value }: { value: number }) {
  const isNeg = value < 0
  const isPos = value > 0
  return (
    <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-xs ${
      isNeg ? 'text-red-400' : isPos ? 'text-blue-500' : 'text-gray-300'
    }`}>
      {value === 0 ? '—'
        : isNeg
          ? `− ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
          : `+ ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      }
    </td>
  )
}

export default function BalanceSummaryClient({ isAdmin, userChurchId, churchCurrencyCode }: Props) {
  const t = useTranslations('balance')
  const tc = useTranslations('common')
  const locale = useLocale()

  const { churchId: selectedChurchId, year, month } = useChurchStore()
  const churchId = isAdmin ? selectedChurchId : (userChurchId ?? selectedChurchId)

  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cc, setCc] = useState(churchCurrencyCode)
  const [churchName, setChurchName] = useState('')

  // 교회 정보(통화코드, 이름) 가져오기
  useEffect(() => {
    if (!churchId) return
    fetch('/api/churches')
      .then(r => r.json())
      .then((list: { id: number; currencyCode: string; nameKo: string; nameRu: string }[]) => {
        const found = list.find(c => c.id === churchId)
        if (found) {
          setCc(found.currencyCode)
          setChurchName(locale === 'ru' ? (found.nameRu || found.nameKo) : found.nameKo)
        }
      })
      .catch(() => {})
  }, [churchId, locale])

  useEffect(() => {
    if (!churchId || !year || !month) { setReport(null); return }
    setLoading(true)
    setError(null)
    fetch(`/api/reports/monthly?churchId=${churchId}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setReport(data)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [churchId, year, month])

  const [showTextReport, setShowTextReport] = useState(false)
  const [copied, setCopied] = useState(false)

  const pageTitle = month
    ? `${t('title')} — ${year}${tc('year')} ${month}${tc('month')}`
    : t('title')

  // ── 텍스트 보고 양식 생성 ──
  function generateText(): string {
    if (!report || !year || !month) return ''
    const fmtL = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    const fmtU = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    const sep = '──────────────'
    const L: string[] = []

    // 블록 표시 여부 판단
    const hasCash = report.prevCashLocal !== 0 || report.curCashIncomeLocal > 0 || report.curCashLocalExp > 0
      || report.ftBankToCash > 0 || report.ftCashToBank > 0 || report.ftCashToUsdLocal > 0 || report.ftUsdToCashLocal > 0
    const hasUsd = report.prevCashUsd !== 0 || report.monthlyIncomeUsd > 0 || report.curCashUsdExp > 0
      || report.ftCashToUsdUsd > 0 || report.ftUsdToCashUsd > 0

    L.push(`📊 ${year}년 ${month}월 자금현황`)
    if (churchName) L.push(churchName)
    L.push(sep)

    // 📒 통장
    L.push(`📒 통장 (${cc})`)
    L.push(`  ① 전월이월   ${fmtL(report.prevBankbook)}`)
    L.push(`  ② 수    입   ${report.curBankIncomeLocal > 0 ? '+' : ''}${fmtL(report.curBankIncomeLocal)}`)
    L.push(`  ③ 지    출   ${report.curBankExp > 0 ? '−' : ''}${fmtL(report.curBankExp)}`)
    if (report.ftBankToCash > 0) L.push(`     통장→현금   −${fmtL(report.ftBankToCash)}`)
    if (report.ftCashToBank > 0) L.push(`     현금→통장   +${fmtL(report.ftCashToBank)}`)
    L.push(`  ④ 잔    액   ${fmtL(report.bankbookBalance)}`)

    // 💵 현금 (있을 때만)
    if (hasCash) {
      L.push(sep)
      L.push(`💵 현금 (${cc})`)
      L.push(`  ① 전월이월   ${fmtL(report.prevCashLocal)}`)
      L.push(`  ② 수    입   ${report.curCashIncomeLocal > 0 ? '+' : ''}${fmtL(report.curCashIncomeLocal)}`)
      L.push(`  ③ 지    출   ${report.curCashLocalExp > 0 ? '−' : ''}${fmtL(report.curCashLocalExp)}`)
      if (report.ftBankToCash > 0)     L.push(`     통장→현금   +${fmtL(report.ftBankToCash)}`)
      if (report.ftCashToBank > 0)     L.push(`     현금→통장   −${fmtL(report.ftCashToBank)}`)
      if (report.ftCashToUsdLocal > 0) L.push(`     현금→달러   −${fmtL(report.ftCashToUsdLocal)}`)
      if (report.ftUsdToCashLocal > 0) L.push(`     달러→현금   +${fmtL(report.ftUsdToCashLocal)}`)
      L.push(`  ④ 잔    액   ${fmtL(report.cashLocalBalance)}`)
    }

    // 💲 달러 (있을 때만)
    if (hasUsd) {
      L.push(sep)
      L.push(`💲 달러 (USD)`)
      L.push(`  ① 전월이월   $${fmtU(report.prevCashUsd)}`)
      L.push(`  ② 수    입   ${report.monthlyIncomeUsd > 0 ? '+$' : '$'}${fmtU(report.monthlyIncomeUsd)}`)
      L.push(`  ③ 지    출   ${report.curCashUsdExp > 0 ? '−$' : '$'}${fmtU(report.curCashUsdExp)}`)
      if (report.ftCashToUsdUsd > 0) L.push(`     현금→달러   +$${fmtU(report.ftCashToUsdUsd)}`)
      if (report.ftUsdToCashUsd > 0) L.push(`     달러→현금   −$${fmtU(report.ftUsdToCashUsd)}`)
      L.push(`  ④ 잔    액   $${fmtU(report.cashUsdBalance)}`)
    }

    // 합계 (현금 블록이 있을 때만 — 통장+현금 합산, 달러 제외)
    if (hasCash) {
      L.push(sep)
      L.push(`합    계 (${cc})`)
      L.push(`  ① 전월이월   ${fmtL(report.prevBankbook + report.prevCashLocal)}`)
      L.push(`  ② 수    입   ${(report.curBankIncomeLocal + report.curCashIncomeLocal) > 0 ? '+' : ''}${fmtL(report.curBankIncomeLocal + report.curCashIncomeLocal)}`)
      L.push(`  ③ 지    출   ${(report.curBankExp + report.curCashLocalExp) > 0 ? '−' : ''}${fmtL(report.curBankExp + report.curCashLocalExp)}`)
      L.push(`  ④ 잔    액   ${fmtL(report.bankbookBalance + report.cashLocalBalance)}`)
    }

    // 자금이동 비고
    const hasFt = report.ftBankToCash > 0 || report.ftCashToBank > 0
      || report.ftCashToUsdLocal > 0 || report.ftUsdToCashLocal > 0
    if (hasFt) {
      L.push(sep)
      L.push('📌 자금이동')
      if (report.ftBankToCash > 0)
        L.push(`• 통장→현금: ${fmtL(report.ftBankToCash)} ${cc}`)
      if (report.ftCashToBank > 0)
        L.push(`• 현금→통장: ${fmtL(report.ftCashToBank)} ${cc}`)
      if (report.ftCashToUsdLocal > 0 && report.ftCashToUsdUsd > 0) {
        const rate = Math.round(report.ftCashToUsdLocal / report.ftCashToUsdUsd)
        L.push(`• 현금→달러: ${fmtL(report.ftCashToUsdLocal)} ${cc} → $${fmtU(report.ftCashToUsdUsd)}`)
        L.push(`  (1 USD = ${fmtL(rate)} ${cc})`)
      }
      if (report.ftUsdToCashLocal > 0 && report.ftUsdToCashUsd > 0) {
        const rate = Math.round(report.ftUsdToCashLocal / report.ftUsdToCashUsd)
        L.push(`• 달러→현금: $${fmtU(report.ftUsdToCashUsd)} → ${fmtL(report.ftUsdToCashLocal)} ${cc}`)
        L.push(`  (1 USD = ${fmtL(rate)} ${cc})`)
      }
    }

    return L.join('\n')
  }

  const cardBase = 'rounded-xl border p-5 flex flex-col gap-1'

  return (
    <div className="space-y-5 max-w-3xl">
      <h2 className="text-xl font-bold text-gray-800">{pageTitle}</h2>

      <div className="flex items-center gap-3">
        <MonthPicker />
      </div>

      {!month && (
        <p className="text-sm text-gray-400 text-center py-8">{tc('selectMonth')}</p>
      )}

      {loading && (
        <p className="text-sm text-gray-400 text-center py-8">{tc('loading')}</p>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center py-4">{error}</p>
      )}

      {report && !loading && (
        <>
          {/* ── 잔액 요약 카드 3개 ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* 통장 */}
            <div className={`${cardBase} bg-blue-50 border-blue-200`}>
              <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">📒 {t('bankbook')}</p>
              <p className="text-2xl font-bold text-blue-700 tabular-nums">
                {report.bankbookBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-400">{cc}</p>
            </div>

            {/* 현금 (현지화폐) */}
            <div className={`${cardBase} bg-emerald-50 border-emerald-200`}>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">💵 {t('cashLocal')}</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                {report.cashLocalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-400">{cc}</p>
            </div>

            {/* 현금 (USD) */}
            <div className={`${cardBase} bg-violet-50 border-violet-200`}>
              <p className="text-xs font-medium text-violet-500 uppercase tracking-wide">💵 {t('cashUsd')}</p>
              <p className="text-2xl font-bold text-violet-700 tabular-nums">
                {report.cashUsdBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-violet-400">USD</p>
            </div>
          </div>

          {/* ── 세부 내역 테이블 ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium w-40"></th>
                  <th className="px-4 py-3 text-right font-medium">
                    📒 {t('bankbook')} ({cc})
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    💵 {t('cashLocal')} ({cc})
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    💵 {t('cashUsd')} (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">

                {/* 전월이월 */}
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-500">{t('prevBalance')}</td>
                  <AmtCell value={report.prevBankbook} />
                  <AmtCell value={report.prevCashLocal} />
                  <AmtCell value={report.prevCashUsd} />
                </tr>

                {/* 수입 */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-500">↑ {t('income')}</td>
                  <SignedAmtCell value={report.curBankIncomeLocal} />
                  <SignedAmtCell value={report.curCashIncomeLocal} />
                  <SignedAmtCell value={report.monthlyIncomeUsd} />
                </tr>

                {/* 지출 */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-500">↓ {t('expense')}</td>
                  <SignedAmtCell value={-report.curBankExp} />
                  <SignedAmtCell value={-report.curCashLocalExp} />
                  <SignedAmtCell value={-report.curCashUsdExp} />
                </tr>

                {/* 자금이동 — 유형별 개별 행 */}
                {report.ftBankToCash > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-400 pl-6">🏦통장 ↔ 💵현금</td>
                    <SignedAmtCell value={-report.ftBankToCash} />
                    <SignedAmtCell value={report.ftBankToCash} />
                    <SignedAmtCell value={0} />
                  </tr>
                )}
                {report.ftCashToBank > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-400 pl-6">🏦통장 ↔ 💵현금</td>
                    <SignedAmtCell value={report.ftCashToBank} />
                    <SignedAmtCell value={-report.ftCashToBank} />
                    <SignedAmtCell value={0} />
                  </tr>
                )}
                {report.ftCashToUsdLocal > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-400 pl-6">💵현금 ↔ 💲달러</td>
                    <SignedAmtCell value={0} />
                    <SignedAmtCell value={-report.ftCashToUsdLocal} />
                    <SignedAmtCell value={report.ftCashToUsdUsd} />
                  </tr>
                )}
                {report.ftUsdToCashLocal > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-400 pl-6">💵현금 ↔ 💲달러</td>
                    <SignedAmtCell value={0} />
                    <SignedAmtCell value={report.ftUsdToCashLocal} />
                    <SignedAmtCell value={-report.ftUsdToCashUsd} />
                  </tr>
                )}

                {/* 구분선 */}
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-0"></td>
                </tr>

                {/* 현재 잔액 */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{t('currentBalance')}</td>
                  <AmtCell value={report.bankbookBalance} highlight />
                  <AmtCell value={report.cashLocalBalance} highlight />
                  <AmtCell value={report.cashUsdBalance} highlight />
                </tr>

              </tbody>
            </table>
          </div>

          {/* ── 자금이동 특이사항 ── */}
          {(report.ftBankToCash > 0 || report.ftCashToBank > 0 || report.ftCashToUsdLocal > 0 || report.ftUsdToCashLocal > 0) && (() => {
            const fmtL = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            const fmtU = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
            const rateC2U = report.ftCashToUsdUsd > 0 ? Math.round(report.ftCashToUsdLocal / report.ftCashToUsdUsd) : null
            const rateU2C = report.ftUsdToCashUsd > 0 ? Math.round(report.ftUsdToCashLocal / report.ftUsdToCashUsd) : null
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">📌 {t('ftNotes')}</p>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {report.ftBankToCash > 0 && (
                    <li>• 통장 → 현금 : <span className="font-medium">{fmtL(report.ftBankToCash)} {cc}</span> 이동</li>
                  )}
                  {report.ftCashToBank > 0 && (
                    <li>• 현금 → 통장 : <span className="font-medium">{fmtL(report.ftCashToBank)} {cc}</span> 이동</li>
                  )}
                  {report.ftCashToUsdLocal > 0 && (
                    <li>• 현금 중에서 달러로 전환 : <span className="font-medium">{fmtL(report.ftCashToUsdLocal)} {cc}</span> → <span className="font-medium">${fmtU(report.ftCashToUsdUsd)}</span>{rateC2U ? ` (1 USD = ${fmtL(rateC2U)})` : ''}</li>
                  )}
                  {report.ftUsdToCashLocal > 0 && (
                    <li>• 달러를 현금으로 전환 : <span className="font-medium">${fmtU(report.ftUsdToCashUsd)}</span> → <span className="font-medium">{fmtL(report.ftUsdToCashLocal)} {cc}</span>{rateU2C ? ` (1 USD = ${fmtL(rateU2C)})` : ''}</li>
                  )}
                </ul>
              </div>
            )
          })()}

          {/* ── 텍스트 보고 양식 버튼 ── */}
          <button
            onClick={() => setShowTextReport(true)}
            className="w-full py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            📋 텍스트 보고 양식 생성
          </button>

        </>
      )}

      {/* ── 텍스트 보고 모달 ── */}
      {showTextReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">📋 텍스트 보고 양식</h3>
              <button
                onClick={() => { setShowTextReport(false); setCopied(false) }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >✕</button>
            </div>
            <textarea
              readOnly
              value={generateText()}
              className="w-full h-96 text-xs font-mono border border-gray-200 rounded-lg p-3 resize-none bg-gray-50 text-gray-700 leading-relaxed"
            />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(generateText())
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? '✓ 복사됨!' : '클립보드에 복사'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

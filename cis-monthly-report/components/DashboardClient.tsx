'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'
import MonthPicker from './MonthPicker'

interface Report {
  currencyCode: string
  exchangeRateToUsd: number
  usdToKrw: number
  localToKrw: number
  rateSourceYear: number
  rateSourceMonth: number
  prevBalanceLocal: number;    prevBalanceUsd: number
  monthlyIncomeLocal: number;  monthlyIncomeUsd: number
  monthlyExpenseLocal: number; monthlyExpenseUsd: number
  monthlyBalanceLocal: number; monthlyBalanceUsd: number
  accountingBalanceLocal: number; accountingBalanceUsd: number
}

function fmt(n: number) {
  if (!n || n === 0) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const thCls = 'px-3 py-2.5 text-center text-sm font-semibold text-gray-700 border-r border-sky-200 last:border-0'
const tdCls = 'px-3 py-2.5 text-right text-sm border-r border-gray-100 last:border-0'
const tdLCls = 'px-3 py-2.5 text-left text-sm font-medium border-r border-gray-100'

export default function DashboardClient() {
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const { churchId, year, month } = useChurchStore()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!churchId || !month) { setReport(null); return }
    setLoading(true)
    fetch(`/api/reports/monthly?churchId=${churchId}&year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [churchId, year, month])

  const cc = report?.currencyCode ?? ''
  const rate = report?.exchangeRateToUsd ?? 0
  const usdToKrw = report?.usdToKrw ?? 0
  const localToKrw = report?.localToKrw ?? 0
  const rateIsFromPrevMonth = report && (report.rateSourceYear !== year || report.rateSourceMonth !== month)

  return (
    <div className="space-y-4">
      <MonthPicker />
      {!month ? (
        <p className="text-sm text-gray-400">{t('selectMonthHint')}</p>
      ) : loading ? (
        <p className="text-sm text-gray-400">{tc('loading')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-sky-100">
                  <th className={thCls}>{tc('currency')}</th>
                  <th className={thCls}>{t('prevBalance')}</th>
                  <th className={thCls}>{t('monthlyIncome')}</th>
                  <th className={thCls}>{t('monthlyExpense')}</th>
                  <th className={thCls}>{t('monthlyBalance')}</th>
                  <th className={thCls}>{t('accountingBalance')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className={tdLCls}>
                    <div>{tc('local')}{cc && <span className="ml-1 text-gray-400 text-xs">({cc})</span>}</div>
                    {localToKrw > 0 && (
                      <div className="text-[11px] text-emerald-600 mt-0.5">1 {cc} ≈ {localToKrw.toFixed(4)} ₩</div>
                    )}
                  </td>
                  <td className={tdCls}>{fmt(report?.prevBalanceLocal ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyIncomeLocal ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyExpenseLocal ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyBalanceLocal ?? 0)}</td>
                  <td className={`${tdCls} bg-amber-50 font-semibold`}>{fmt(report?.accountingBalanceLocal ?? 0)}</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className={tdLCls}>
                    <div>USD</div>
                    {rate > 0 && (
                      <div className="text-[11px] text-gray-400 mt-0.5">1 USD = {rate.toLocaleString('en-US', { maximumFractionDigits: 0 })} {cc}</div>
                    )}
                    {usdToKrw > 0 && (
                      <div className="text-[11px] text-emerald-600 mt-0.5">1 USD = {usdToKrw.toLocaleString('en-US', { maximumFractionDigits: 2 })} ₩</div>
                    )}
                  </td>
                  <td className={tdCls}>{fmt(report?.prevBalanceUsd ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyIncomeUsd ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyExpenseUsd ?? 0)}</td>
                  <td className={tdCls}>{fmt(report?.monthlyBalanceUsd ?? 0)}</td>
                  <td className={`${tdCls} bg-amber-50 font-semibold`}>{fmt(report?.accountingBalanceUsd ?? 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {rateIsFromPrevMonth && (rate > 0 || usdToKrw > 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              {t('rateWarning', { year, month: month!, srcYear: report!.rateSourceYear, srcMonth: report!.rateSourceMonth })}
            </p>
          )}
        </>
      )}
    </div>
  )
}

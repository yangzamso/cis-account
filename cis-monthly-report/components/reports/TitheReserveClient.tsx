'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'

interface TitheRow {
  month: number
  totalOfferings: number
  oneTenth: number
  prevBalance: number
  remittanceToHq: number
  balance: number
}

function fmt(n: number) {
  if (!n || n === 0) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function TitheReserveClient() {
  const t = useTranslations('titheReserve')
  const tc = useTranslations('common')
  const { churchId, year, setYear } = useChurchStore()
  const [rows, setRows] = useState<TitheRow[]>([])
  const [loading, setLoading] = useState(false)
  const [currencyCode, setCurrencyCode] = useState('')

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    if (!churchId) return
    fetch('/api/churches')
      .then(r => r.json())
      .then((list: { id: number; currencyCode: string }[]) => {
        const found = list.find(c => c.id === churchId)
        if (found) setCurrencyCode(found.currencyCode)
      })
      .catch(() => {})
  }, [churchId])

  useEffect(() => {
    if (!churchId) return
    setLoading(true)
    fetch(`/api/reports/tithe-reserve?churchId=${churchId}&year=${year}`)
      .then(r => r.json())
      .then(setRows)
      .finally(() => setLoading(false))
  }, [churchId, year])

  const totalOfferings = rows.reduce((s, r) => s + r.totalOfferings, 0)
  const totalOneTenth = rows.reduce((s, r) => s + r.oneTenth, 0)
  const totalRemittance = rows.reduce((s, r) => s + r.remittanceToHq, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}{tc('year')}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{tc('loading')}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-green-50">
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">월</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">{t('totalOfferings')}</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">{t('oneTenth')}</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">{t('prevBalance')}</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">{t('remittanceToHq')}</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-600">{t('balance')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.month} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">{MONTH_KO[r.month - 1]}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-red-600">{fmt(r.totalOfferings)} {currencyCode}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-red-600">{fmt(r.oneTenth)} {currencyCode}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right">{fmt(r.prevBalance)} {currencyCode}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-red-600">${fmt(r.remittanceToHq)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right">{fmt(r.balance)} {currencyCode}</td>
                </tr>
              ))}
              <tr className="bg-amber-50 font-medium">
                <td className="border border-gray-300 px-3 py-2 text-center">{tc('total')}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{fmt(totalOfferings)} {currencyCode}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{fmt(totalOneTenth)} {currencyCode}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">-</td>
                <td className="border border-gray-300 px-3 py-2 text-right">${fmt(totalRemittance)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{fmt(rows[11]?.balance ?? 0)} {currencyCode}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

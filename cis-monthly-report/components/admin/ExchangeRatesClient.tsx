'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const CURRENCIES = ['USD', 'RUB', 'UZS', 'UAH', 'KZT'] as const
type CC = typeof CURRENCIES[number]

interface RateRow { rateToUsd: number; usdToKrw: number }
type RatesMap = Record<CC, RateRow>

const EMPTY_RATES: RatesMap = {
  USD: { rateToUsd: 1, usdToKrw: 0 },
  RUB: { rateToUsd: 0, usdToKrw: 0 },
  UZS: { rateToUsd: 0, usdToKrw: 0 },
  UAH: { rateToUsd: 0, usdToKrw: 0 },
  KZT: { rateToUsd: 0, usdToKrw: 0 },
}

function calcLocalToKrw(rateToUsd: number, usdToKrw: number) {
  if (!rateToUsd || !usdToKrw) return null
  return (usdToKrw / rateToUsd).toFixed(4)
}

function formatRefDate(dateStr: string, tc: (key: string) => string) {
  const [y, m, d] = dateStr.split('-')
  return `${y}${tc('year')} ${Number(m)}${tc('month')} ${Number(d)}일`
}

export default function ExchangeRatesClient() {
  const tc = useTranslations('common')
  const te = useTranslations('exchangeRates')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rates, setRates] = useState<RatesMap>(structuredClone(EMPTY_RATES))
  const [referenceDate, setReferenceDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/currency-rates?year=${year}&month=${month}`)
    const data: { rows: { currencyCode: string; rateToUsd: number; usdToKrw: number }[]; referenceDate: string } = await res.json()
    const next = structuredClone(EMPTY_RATES)
    for (const r of data.rows) {
      if (r.currencyCode in next) {
        next[r.currencyCode as CC] = { rateToUsd: r.rateToUsd, usdToKrw: r.usdToKrw }
      }
    }
    setRates(next)
    setReferenceDate(data.referenceDate || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month])

  async function autoFill() {
    setAutoFilling(true)
    setFetchError(null)
    setReferenceDate(null)

    const res = await fetch(`/api/currency-rates/fetch?year=${year}&month=${month}`)
    const data = await res.json()

    if (!res.ok || data.error) {
      setFetchError(data.error ?? te('fetchError'))
      setAutoFilling(false)
      return
    }

    const next = structuredClone(EMPTY_RATES)
    for (const [cc, v] of Object.entries(data.rates) as [CC, RateRow][]) {
      next[cc] = v
    }
    setRates(next)
    setReferenceDate(data.referenceDate)
    setSaved(false)
    setAutoFilling(false)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/currency-rates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year, month, rates, referenceDate }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
    await load()
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-4 max-w-2xl">

      {/* 연/월 선택 + 자동채움 + 저장 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
          {years.map(y => <option key={y} value={y}>{y}{tc('year')}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}{tc('month')}</option>
          ))}
        </select>
        <button onClick={autoFill} disabled={autoFilling}
          className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded hover:bg-green-50 disabled:opacity-50 flex items-center gap-1.5">
          {autoFilling
            ? <><span className="animate-spin">↻</span> {te('fetching')}</>
            : te('autoFill')}
        </button>
        <button onClick={save} disabled={saving || loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? tc('saving') : tc('save')}
        </button>
        {saved && <span className="text-sm text-emerald-600">{tc('success')}</span>}
      </div>

      {/* 오류 메시지 */}
      {fetchError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{fetchError}</p>
      )}

      {/* 기준일 표시 — DB에 저장된 값 또는 자동채움 결과 */}
      {referenceDate ? (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          <span className="text-blue-400">📅</span>
          <strong>{te('referenceDate', { date: formatRefDate(referenceDate, tc) })}</strong>
          <span className="text-blue-400 text-xs">(fawazahmed0/currency-api)</span>
        </div>
      ) : (
        <div className="text-sm text-gray-400 px-1">{te('noReferenceDate')}</div>
      )}

      {/* 원화 환율 표시 */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">1 USD =</span>
        <span className="text-sm font-semibold text-gray-900">
          {rates.USD.usdToKrw ? rates.USD.usdToKrw.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'}
        </span>
        <span className="text-sm font-medium text-gray-700">₩ ({te('krwNote')})</span>
      </div>

      {/* 환율 테이블 */}
      {loading ? (
        <p className="text-sm text-gray-400">{tc('loading')}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <colgroup>
              <col />
              <col className="w-48" />
              <col className="w-48" />
            </colgroup>
            <thead>
              <tr className="bg-sky-100 text-gray-700">
                <th className="px-4 py-3 text-left font-semibold border-r border-sky-200">{tc('currency')}</th>
                <th className="px-4 py-3 text-center font-semibold border-r border-sky-200">{te('localPerUsd')}</th>
                <th className="px-4 py-3 text-center font-semibold">{te('localPerKrw')}</th>
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.map((cc, i) => {
                const r = rates[cc]
                const localToKrw = calcLocalToKrw(r.rateToUsd, r.usdToKrw)
                return (
                  <tr key={cc} className={`border-t border-gray-100 ${i % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className="font-semibold text-gray-800">{cc}</span>
                      <span className="ml-1.5 text-xs text-gray-400">({te(`countries.${cc}`)})</span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-100">
                      <div className="flex items-center px-1">
                        <span className={cc === 'USD' ? 'text-gray-400' : 'text-gray-500 font-medium'}>$</span>
                        <span className={`flex-1 text-right ${cc === 'USD' ? 'text-gray-400' : 'text-gray-800'}`}>
                          {cc === 'USD' ? te('fixed') : r.rateToUsd ? r.rateToUsd.toFixed(2) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 bg-yellow-50">
                      {localToKrw ? (
                        <div className="flex items-center">
                          <span className="text-gray-900 font-bold">₩</span>
                          <span className="flex-1 text-right text-gray-900 font-bold">{localToKrw}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 px-1">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

'use client'

import { useChurchStore } from '@/lib/store'
import { useTranslations } from 'next-intl'

export default function MonthPicker() {
  const t = useTranslations('common')
  const { year, month, setYear, setMonth } = useChurchStore()

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {years.map(y => <option key={y} value={y}>{y}{t('year')}</option>)}
      </select>
      <select
        value={month ?? ''}
        onChange={e => setMonth(e.target.value === '' ? null : Number(e.target.value))}
        className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">{t('allMonths')}</option>
        {months.map(m => <option key={m} value={m}>{m}{t('month')}</option>)}
      </select>
    </div>
  )
}

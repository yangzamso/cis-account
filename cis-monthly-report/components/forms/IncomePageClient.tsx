'use client'

import { Fragment, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'
import MonthPicker from '../MonthPicker'

interface IncomeFormData {
  date: string
  tithes: number
  sundayOfferings: number
  thanksgiving: number
  centerSupport: number
  otherOfferings: number
  buildingFund: number
  hqBuildingFund: number
  otherIncome: number
  currencyType: 'usd' | 'local'
  paymentMethod: 'bank' | 'cash'
  notes: string
}

interface IncomeRecord extends IncomeFormData {
  id: number
}

const FIELDS: (keyof Omit<IncomeFormData, 'date' | 'currencyType' | 'notes'>)[] = [
  'tithes', 'sundayOfferings', 'thanksgiving', 'centerSupport',
  'otherOfferings', 'buildingFund', 'hqBuildingFund', 'otherIncome'
]

function fmt(n: number) {
  return n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
}

interface Props {
  isAdmin: boolean
  churchCurrencyCode: string
}

export default function IncomePageClient({ isAdmin, churchCurrencyCode }: Props) {
  const t = useTranslations('income')
  const tc = useTranslations('common')
  const { churchId: selectedChurchId, year, month } = useChurchStore()
  const churchId = selectedChurchId
  const [records, setRecords] = useState<IncomeRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // 관리자는 선택된 교회의 통화 코드를 동적으로 가져옴
  const [localCurrencyCode, setLocalCurrencyCode] = useState(churchCurrencyCode)
  useEffect(() => {
    if (!isAdmin || !selectedChurchId) return
    fetch('/api/churches')
      .then(r => r.json())
      .then((list: { id: number; currencyCode: string }[]) => {
        const found = list.find(c => c.id === selectedChurchId)
        if (found) setLocalCurrencyCode(found.currencyCode)
      })
  }, [isAdmin, selectedChurchId])

  const today = new Date().toISOString().slice(0, 10)

  // 추가 폼
  const { register, handleSubmit, reset } = useForm<IncomeFormData>({
    defaultValues: { date: today, currencyType: 'local', paymentMethod: 'bank' }
  })

  // 수정 폼
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<IncomeFormData>()

  async function load() {
    if (!churchId || !year) { setRecords([]); return }
    const url = month
      ? `/api/income?churchId=${churchId}&year=${year}&month=${month}`
      : `/api/income?churchId=${churchId}&year=${year}`
    const r = await fetch(url)
    if (!r.ok) return
    const text = await r.text()
    if (!text) return
    setRecords(JSON.parse(text))
  }

  useEffect(() => {
    if (!year) { setRecords([]); return }
    load()
  }, [churchId, year, month])

  async function onSubmit(data: IncomeFormData) {
    if (!churchId) return
    setSaving(true)
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, churchId }),
    })
    reset({ date: today, currencyType: 'local' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  function startEdit(rec: IncomeRecord) {
    setEditingId(rec.id)
    setShowForm(false)
    resetEdit({
      date: rec.date,
      currencyType: rec.currencyType,
      paymentMethod: rec.paymentMethod ?? 'bank',
      notes: rec.notes,
      tithes: rec.tithes,
      sundayOfferings: rec.sundayOfferings,
      thanksgiving: rec.thanksgiving,
      centerSupport: rec.centerSupport,
      otherOfferings: rec.otherOfferings,
      buildingFund: rec.buildingFund,
      hqBuildingFund: rec.hqBuildingFund,
      otherIncome: rec.otherIncome,
    })
  }

  async function onEditSubmit(data: IncomeFormData) {
    if (!editingId) return
    setEditSaving(true)
    await fetch('/api/income', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, id: editingId }),
    })
    setEditingId(null)
    await load()
    setEditSaving(false)
  }

  async function deleteRecord(id: number) {
    await fetch(`/api/income?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const total = (field: keyof Omit<IncomeFormData, 'date' | 'currencyType' | 'notes'>) =>
    records.reduce((s, r) => s + (Number(r[field]) || 0), 0)

  const pageTitle = month
    ? `${t('title')} - ${year}${tc('year')} ${month}${tc('month')}`
    : year ? `${t('title')} - ${year}${tc('year')} ${tc('allMonths')}` : t('title')

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{pageTitle}</h2>
      <div className="flex items-center gap-3">
        <MonthPicker />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-sky-50 text-gray-600">
              <th className="px-3 py-2 text-left border-b border-gray-100">{tc('date')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100">{t('paymentMethod')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100">{tc('currency')}</th>
              {FIELDS.map(f => <th key={f} className="px-3 py-2 text-right border-b border-gray-100">{t(f as Parameters<typeof t>[0])}</th>)}
              <th className="px-3 py-2 border-b border-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && !showForm ? (
              <tr><td colSpan={FIELDS.length + 4} className="px-3 py-6 text-center text-gray-400">{tc('noData')}</td></tr>
            ) : records.map(rec => (
              editingId === rec.id ? (
                // 인라인 수정 행
                <Fragment key={rec.id}>
                  <tr className="border-b border-amber-100 bg-amber-50/40">
                    <td className="px-2 py-1.5" style={{ minWidth: 110 }}>
                      <input type="date" {...regEdit('date', { required: true })}
                        className={inputCls} />
                    </td>
                    <td className="px-2 py-1.5" style={{ minWidth: 80 }}>
                      <select {...regEdit('paymentMethod')} className={inputCls}>
                        <option value="bank">{t('bank')}</option>
                        <option value="cash">{t('cash')}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5" style={{ minWidth: 80 }}>
                      <select {...regEdit('currencyType')}
                        className={inputCls}>
                        <option value="local">{localCurrencyCode}</option>
                        {localCurrencyCode !== 'USD' && <option value="usd">USD</option>}
                      </select>
                    </td>
                    {FIELDS.map(f => (
                      <td key={f} className="px-2 py-1.5" style={{ minWidth: 80 }}>
                        <input type="number" step="0.01" min="0" {...regEdit(f, { valueAsNumber: true })}
                          className={inputCls + ' text-right'} placeholder="0" />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={editSaving} onClick={handleEdit(onEditSubmit)}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                          {editSaving ? tc('saving') : tc('save')}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500">✕</button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-amber-100 bg-amber-50/20">
                    <td colSpan={FIELDS.length + 4} className="px-2 pb-2">
                      <input {...regEdit('notes')}
                        className={inputCls + ' text-gray-500'}
                        placeholder={`${tc('notes')} (${tc('optional')})`} />
                    </td>
                  </tr>
                </Fragment>
              ) : (
                // 일반 데이터 행
                <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">{rec.date}</td>
                  <td className="px-3 py-2 text-center">
                    {rec.paymentMethod === 'cash'
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">{t('cash')}</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">{t('bank')}</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-400">
                    {rec.currencyType === 'usd' ? 'USD' : localCurrencyCode}
                  </td>
                  {FIELDS.map(f => <td key={f} className="px-3 py-2 text-right">{fmt(Number(rec[f]) || 0)}</td>)}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button onClick={() => startEdit(rec)}
                        className="px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                        {tc('edit')}
                      </button>
                      <button onClick={() => deleteRecord(rec.id)}
                        className="px-2 py-0.5 text-xs border border-red-200 rounded text-red-500 hover:bg-red-50 whitespace-nowrap">
                        {tc('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {/* 신규 입력 행 — 합계 바로 위 */}
            {showForm && (<>
              <tr className="border-b border-blue-100 bg-blue-50/40">
                <td className="px-2 py-1.5" style={{ minWidth: 110 }}>
                  <input type="date" {...register('date', { required: true })} className={inputCls} />
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: 80 }}>
                  <select {...register('paymentMethod')} className={inputCls}>
                    <option value="bank">{t('bank')}</option>
                    <option value="cash">{t('cash')}</option>
                  </select>
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: 80 }}>
                  <select {...register('currencyType')} className={inputCls}>
                    <option value="local">{localCurrencyCode}</option>
                    {localCurrencyCode !== 'USD' && <option value="usd">USD</option>}
                  </select>
                </td>
                {FIELDS.map(f => (
                  <td key={f} className="px-2 py-1.5" style={{ minWidth: 80 }}>
                    <input type="number" step="0.01" min="0" {...register(f, { valueAsNumber: true })}
                      className={inputCls + ' text-right'} placeholder="0" />
                  </td>
                ))}
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={saving} onClick={handleSubmit(onSubmit)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {saving ? tc('saving') : tc('save')}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500">✕</button>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-blue-100 bg-blue-50/20">
                <td colSpan={FIELDS.length + 4} className="px-2 pb-2">
                  <input {...register('notes')}
                    className={inputCls + ' text-gray-500'}
                    placeholder={`${tc('notes')} (${tc('optional')})`} />
                </td>
              </tr>
            </>)}

            {records.length > 0 && (
              <tr className="bg-amber-50 font-medium">
                <td className="px-3 py-2">{tc('total')}</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
                {FIELDS.map(f => <td key={f} className="px-3 py-2 text-right">{fmt(total(f))}</td>)}
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => { setShowForm(v => !v); setEditingId(null) }}
            className={`px-3 py-1.5 text-xs rounded-md ${showForm ? 'border border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {showForm ? `✕ ${tc('cancel')}` : `+ ${t('addRecord')}`}
          </button>
        </div>
      </div>
    </div>
  )
}

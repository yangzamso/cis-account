'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'

interface Church {
  id: number
  churchNumber: number | null
  nameKo: string
  nameRu: string
  currencyCode: string
  country: string
  defaultLocale: string
}

interface ChurchForm {
  churchNumber: string
  nameKo: string
  nameRu: string
  currencyCode: string
  country: string
}

interface OpeningBalance {
  id: number
  churchId: number
  year: number
  month: number
  bankbookLocal: number
  cashLocal: number
  cashUsd: number
  note: string
}

interface OpeningForm {
  year: number
  month: number
  bankbookLocal: string
  cashLocal: string
  cashUsd: string
  note: string
}

// ── 이월잔액 설정 패널 ────────────────────────────────────────
function OpeningBalancePanel({ church }: { church: Church }) {
  const ts = useTranslations('settings')
  const tc = useTranslations('common')
  const [row, setRow] = useState<OpeningBalance | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const defaultForm = { year: now.getFullYear(), month: now.getMonth() + 1, bankbookLocal: '', cashLocal: '', cashUsd: '', note: '' }
  const { register, handleSubmit, reset } = useForm<OpeningForm>({ defaultValues: defaultForm })
  const cc = church.currencyCode

  async function load() {
    const r = await fetch(`/api/opening-balances?churchId=${church.id}`)
    const data: OpeningBalance[] = await r.json()
    const found = data[0] ?? null
    setRow(found)
    if (!found) {
      setEditing(true)
      reset(defaultForm)
    }
  }
  useEffect(() => { load() }, [])

  async function onSubmit(data: OpeningForm) {
    setSaving(true)
    await fetch('/api/opening-balances', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        churchId: church.id,
        year: Number(data.year),
        month: Number(data.month),
        bankbookLocal: parseFloat(data.bankbookLocal.replace(/,/g, '')) || 0,
        cashLocal: parseFloat(data.cashLocal.replace(/,/g, '')) || 0,
        cashUsd: parseFloat(data.cashUsd.replace(/,/g, '')) || 0,
        note: data.note,
      }),
    })
    setSaving(false)
    setEditing(false)
    await load()
  }

  function toFormValues(r: OpeningBalance) {
    return {
      year: r.year,
      month: r.month,
      bankbookLocal: r.bankbookLocal ? String(r.bankbookLocal) : '',
      cashLocal: r.cashLocal ? String(r.cashLocal) : '',
      cashUsd: r.cashUsd ? String(r.cashUsd) : '',
      note: r.note,
    }
  }

  function startEdit() {
    if (row) reset(toFormValues(row))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    if (row) reset(toFormValues(row))
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2.5 space-y-2">

      {/* 읽기 모드 — 데이터가 있고 수정 중이 아닐 때 */}
      {row && !editing && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-100 bg-amber-100/40">
            <span className="text-xs font-semibold text-amber-600">
              {ts('openingBalance')}
              <span className="ml-1.5 font-normal text-amber-500">{row.year}{tc('year')} {row.month}{tc('month')}</span>
            </span>
            <button onClick={startEdit} className="text-[11px] text-amber-600 hover:text-amber-800 font-medium">{tc('edit')}</button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-amber-100">
                <th className="px-3 py-1.5 text-right font-medium">{ts('bankbook')}</th>
                <th className="px-3 py-1.5 text-right font-medium">{ts('cash')}</th>
                <th className="px-3 py-1.5 text-right font-medium">{ts('usd')}</th>
                <th className="px-3 py-1.5 text-left font-medium">{tc('notes')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-800">
                <td className="px-3 py-2 text-right font-medium">
                  {(row.bankbookLocal ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  <span className="ml-1 text-slate-500 font-normal">{cc}</span>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {(row.cashLocal ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  <span className="ml-1 text-slate-500 font-normal">{cc}</span>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {(row.cashUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  <span className="ml-1 text-slate-500 font-normal">USD</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{row.note || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 편집 모드 */}
      {editing && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-lg overflow-hidden">
          {/* 헤더: 제목 + 년/월 선택 + 저장/취소 */}
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-amber-100 bg-amber-100/40">
            <span className="text-xs font-semibold text-amber-600 shrink-0">
              {row ? ts('editOpeningBalance') : ts('addOpeningBalance')}
            </span>
            <div className="flex items-center gap-1.5">
              <input type="number" {...register('year', { required: true })}
                className="w-20 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="2024" />
              <span className="text-xs text-gray-400">{tc('year')}</span>
              <select {...register('month', { required: true })}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}{tc('month')}</option>
                ))}
              </select>
            </div>
            {!row && (
              <p className="text-[11px] text-amber-500 flex-1">
                {ts('openingBalanceHint')}
              </p>
            )}
            <div className="flex gap-2 ml-auto">
              {row && (
                <button type="button" onClick={cancelEdit}
                  className="text-[11px] text-slate-400 hover:text-slate-600">{tc('cancel')}</button>
              )}
              <button type="button" disabled={saving} onClick={handleSubmit(onSubmit)}
                className="text-[11px] text-amber-600 font-medium hover:text-amber-800 disabled:opacity-50">
                {saving ? tc('saving') : tc('save')}
              </button>
            </div>
          </div>

          {/* 표 형태 입력 */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-amber-100">
                <th className="px-3 py-1.5 text-right font-medium">{ts('bankbook')} ({cc})</th>
                <th className="px-3 py-1.5 text-right font-medium">{ts('cash')} ({cc})</th>
                <th className="px-3 py-1.5 text-right font-medium">{ts('usd')} (USD)</th>
                <th className="px-3 py-1.5 text-left font-medium">{tc('notes')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-2">
                  <input type="text" inputMode="decimal" {...register('bankbookLocal')}
                    className={inputCls + ' text-right'} placeholder="0" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" inputMode="decimal" {...register('cashLocal')}
                    className={inputCls + ' text-right'} placeholder="0" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" inputMode="decimal" {...register('cashUsd')}
                    className={inputCls + ' text-right'} placeholder="0" />
                </td>
                <td className="px-2 py-2">
                  <input {...register('note')} className={inputCls} placeholder={ts('openingBalanceNotePlaceholder')} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ── 교회번호 인라인 편집기 ────────────────────────────────────
function ChurchNumberEditor({ church, onSaved, isAdmin }: { church: Church; onSaved: () => void; isAdmin: boolean }) {
  const tc = useTranslations('common')
  const ts = useTranslations('settings')
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(church.churchNumber != null ? String(church.churchNumber) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/churches', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: church.id, churchNumber: value !== '' ? Number(value) : null }),
    })
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  if (!isAdmin) {
    return (
      <span className="w-8 text-center text-xs font-bold text-gray-500 bg-gray-200 rounded px-1.5 py-0.5">
        {church.churchNumber ?? '-'}
      </span>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-14 border border-blue-400 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
          autoFocus
        />
        <button onClick={save} disabled={saving} className="text-[11px] text-blue-600 hover:text-blue-800">{tc('save')}</button>
        <button onClick={() => setEditing(false)} className="text-[11px] text-gray-400 hover:text-gray-600">{tc('cancel')}</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setValue(church.churchNumber != null ? String(church.churchNumber) : ''); setEditing(true) }}
      title={ts('editChurchNumber')}
      className="w-8 text-center text-xs font-bold text-gray-600 bg-gray-200 hover:bg-blue-100 rounded px-1.5 py-0.5 transition-colors">
      {church.churchNumber ?? '?'}
    </button>
  )
}


// ── 재정 운영현황보고 패널 ──────────────────────────────
interface ReportConfig {
  approvalLimit: string
  withdrawer1: string
  withdrawer2: string
  financialSource: string
  checkingStatus: string
}

function ReportConfigPanel({ church }: { church: Church }) {
  const tc = useTranslations('common')
  const ts = useTranslations('settings')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cfg, setCfg] = useState<ReportConfig | null>(null)
  const { register, handleSubmit, reset } = useForm<ReportConfig>({
    defaultValues: { approvalLimit: '', withdrawer1: '', withdrawer2: '', financialSource: '', checkingStatus: '' }
  })

  async function load() {
    const r = await fetch(`/api/church-report-config?churchId=${church.id}`)
    const data = r.ok ? await r.json() : null
    if (data) {
      const mapped: ReportConfig = {
        approvalLimit:   data.approvalLimit ? String(data.approvalLimit) : '',
        withdrawer1:     data.withdrawer1 ?? '',
        withdrawer2:     data.withdrawer2 ?? '',
        financialSource: data.financialSource ?? '',
        checkingStatus:  data.checkingStatus ?? '',
      }
      setCfg(mapped)
    }
  }
  useEffect(() => { load() }, [])

  async function onSubmit(data: ReportConfig) {
    setSaving(true)
    await fetch('/api/church-report-config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ churchId: church.id, ...data, approvalLimit: parseFloat(data.approvalLimit.replace(/,/g, '')) || 0 }),
    })
    setSaving(false)
    setEditing(false)
    await load()
  }

  function startEdit() {
    if (cfg) reset(cfg)
    setEditing(true)
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2.5 space-y-2">

      {/* 읽기 모드 */}
      {cfg && !editing && (
        <div className="bg-purple-50/50 border border-purple-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-100 bg-purple-100/40">
            <span className="text-xs font-semibold text-purple-700">{ts('reportConfig')}</span>
            <button onClick={startEdit} className="text-[11px] text-purple-500 hover:text-purple-700 font-medium">{tc('edit')}</button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-purple-100">
                <th className="px-3 py-1.5 text-right font-medium whitespace-nowrap">{ts('approvalLimit')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('withdrawer1')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('withdrawer2')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('financialSource')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('checkingStatus')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-800">
                <td className="px-3 py-2 text-right font-medium">
                  {cfg.approvalLimit ? parseFloat(cfg.approvalLimit).toLocaleString('en-US') : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-3 py-2">{cfg.withdrawer1 || <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-2">{cfg.withdrawer2 || <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-2">{cfg.financialSource || <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-2">{cfg.checkingStatus || <span className="text-slate-400">-</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 미등록 상태 */}
      {!cfg && !editing && (
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:text-blue-800">
          {ts('addReportConfig')}
        </button>
      )}

      {/* 편집 모드 */}
      {editing && (
        <div className="bg-purple-50/50 border border-purple-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-100 bg-purple-100/40">
            <span className="text-xs font-semibold text-purple-700">{ts('reportConfig')}</span>
            <div className="flex gap-2">
              {cfg && (
                <button type="button" onClick={() => setEditing(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600">{tc('cancel')}</button>
              )}
              <button type="button" disabled={saving} onClick={handleSubmit(onSubmit)}
                className="text-[11px] text-purple-600 font-medium hover:text-purple-800 disabled:opacity-50">
                {saving ? tc('saving') : tc('save')}
              </button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-purple-100">
                <th className="px-3 py-1.5 text-right font-medium whitespace-nowrap">{ts('approvalLimit')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('withdrawer1')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('withdrawer2')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('financialSource')}</th>
                <th className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{ts('checkingStatus')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-2 text-right">
                  <input type="text" inputMode="decimal" {...register('approvalLimit')}
                    className={inputCls + ' text-right'} placeholder="3000000" />
                </td>
                <td className="px-2 py-2">
                  <input {...register('withdrawer1')} className={inputCls} placeholder={ts('namePlaceholder')} />
                </td>
                <td className="px-2 py-2">
                  <input {...register('withdrawer2')} className={inputCls} placeholder={ts('namePlaceholder')} />
                </td>
                <td className="px-2 py-2">
                  <input {...register('financialSource')} className={inputCls} placeholder={ts('financialSourcePlaceholder')} />
                </td>
                <td className="px-2 py-2">
                  <input {...register('checkingStatus')} className={inputCls} placeholder={ts('checkingStatusPlaceholder')} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ── 메인 설정 컴포넌트 ────────────────────────────────────────
export default function SettingsClient({
  role,
  userChurchId,
}: {
  role: 'admin' | 'member'
  userChurchId: number | null
}) {
  const tc = useTranslations('common')
  const ts = useTranslations('settings')
  const isAdmin = role === 'admin'
  const [churches, setChurches] = useState<Church[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterChurchId, setFilterChurchId] = useState<number | null>(null)
  const { register, handleSubmit, reset } = useForm<ChurchForm>()

  async function load() {
    const r = await fetch('/api/churches')
    const text = await r.text()
    const all: Church[] = text ? JSON.parse(text) : []
    // 어드민: 전체, 멤버: 본인 교회만
    setChurches(isAdmin ? all : all.filter(c => c.id === userChurchId))
  }

  useEffect(() => { load() }, [])

  async function onSubmit(data: ChurchForm) {
    setSaving(true)
    await fetch('/api/churches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, churchNumber: data.churchNumber ? Number(data.churchNumber) : null }),
    })
    reset()
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteChurch(id: number) {
    if (!confirm(ts('deleteConfirm'))) return
    await fetch(`/api/churches?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function setDefaultLocale(id: number, locale: string) {
    await fetch('/api/churches', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, defaultLocale: locale }),
    })
    setChurches(prev => prev.map(c => c.id === id ? { ...c, defaultLocale: locale } : c))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          {/* 필터 드롭다운 */}
          <select
            value={filterChurchId ?? ''}
            onChange={e => setFilterChurchId(e.target.value === '' ? null : Number(e.target.value))}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700 flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">{tc('all')}</option>
            {churches.map(c => (
              <option key={c.id} value={c.id}>
                {c.churchNumber != null ? `${c.churchNumber}. ${c.nameKo}` : c.nameKo}
              </option>
            ))}
          </select>
          {/* 교회 추가는 어드민만 */}
          {isAdmin && (
            <button onClick={() => setShowForm(v => !v)}
              className="shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {showForm ? tc('cancel') : ts('addChurch')}
            </button>
          )}
        </div>

        {isAdmin && showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-5 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{ts('churchNumber')}</label>
                <input type="number" {...register('churchNumber')} placeholder="예: 11"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div />
              <div>
                <label className="block text-xs text-gray-500 mb-1">{ts('churchNameKo')}</label>
                <input {...register('nameKo', { required: true })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{ts('churchNameRu')}</label>
                <input {...register('nameRu', { required: true })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{ts('currencyCode')}</label>
                <input {...register('currencyCode')} placeholder="USD, KZT, UZS..."
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{ts('country')}</label>
                <input {...register('country')}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-100">
                {tc('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {saving ? tc('saving') : tc('save')}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-5">
          {churches.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{tc('noData')}</p>
          ) : churches.filter(c => filterChurchId === null || c.id === filterChurchId).map(c => (
            <div key={c.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChurchNumberEditor church={c} onSaved={load} isAdmin={isAdmin} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.nameKo}</p>
                    <p className="text-xs text-gray-400">{c.nameRu} · {c.currencyCode} · {c.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 기본 언어 옵션 버튼 */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">{ts('defaultLocale')}</span>
                      <div className="flex rounded overflow-hidden border border-gray-200 text-[11px]">
                        <button
                          onClick={() => setDefaultLocale(c.id, 'ko')}
                          className={`px-2 py-0.5 font-medium transition-colors ${
                            c.defaultLocale === 'ko'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          KO
                        </button>
                        <button
                          onClick={() => setDefaultLocale(c.id, 'ru')}
                          className={`px-2 py-0.5 font-medium transition-colors ${
                            c.defaultLocale === 'ru'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          RU
                        </button>
                      </div>
                    </div>
                  )}
                  {/* 교회 삭제 — 안전장치 미비로 임시 비활성화 */}
                  {isAdmin && (
                    <button disabled
                      title={ts('deleteDisabled')}
                      className="text-gray-300 text-xs px-2 py-1 cursor-not-allowed">
                      {tc('delete')}
                    </button>
                  )}
                </div>
              </div>
              {/* 이월잔액 설정 */}
              <OpeningBalancePanel church={c} />
              {/* 재정 운영현황보고 */}
              <ReportConfigPanel church={c} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

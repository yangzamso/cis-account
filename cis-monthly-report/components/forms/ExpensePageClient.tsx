'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale, useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'
import MonthPicker from '../MonthPicker'

interface AccountItem {
  code: string
  nameKo: string
  nameRu: string
  type: string
  keywords: string
}

const CURRENCIES = [
  { code: 'USD', label: 'USD — 달러' },
  { code: 'RUB', label: 'RUB — 루블' },
  { code: 'KZT', label: 'KZT — 텡게' },
  { code: 'UZS', label: 'UZS — 숨' },
  { code: 'UAH', label: 'UAH — 흐리우냐' },
]

interface ExpenseFormData {
  date: string
  merchantRu: string
  merchantKo: string
  managerRu: string
  managerKo: string
  descriptionRu: string
  descriptionKo: string
  amount: number
  currency: string
  paymentMethod: 'bank' | 'cash'
  accountCode: string
  accountNameKo: string
  accountNameRu: string
}

interface ExpenseRecord {
  id: number
  date: string
  merchantKo: string
  merchantRu: string
  managerKo: string
  managerRu: string
  descriptionKo: string
  descriptionRu: string
  amountUsd: number
  amountLocal: number
  currency: string
  paymentMethod: string
  accountCode: string
  accountNameKo: string
  accountNameRu: string
  receiptAttached: boolean
  status: string
  createdBy: number | null
}

type FundTransferType = 'bank_to_cash' | 'cash_to_bank' | 'cash_to_usd' | 'usd_to_cash'

interface FundTransfer {
  id: number
  date: string
  type: FundTransferType
  amountLocal: number
  amountUsd: number
  exchangeRate: number
  note: string
}

interface ReceiptMeta {
  id: number
  filename: string
  mimeType: string
}

interface Props {
  role: 'admin' | 'member'
  userLang: 'ko' | 'ru'
  userId: number
  userChurchId: number | null
  churchCurrencyCode: string
  initialAccountItems: AccountItem[]
}

function fmt(n: number) {
  return n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
}

function ReceiptModal({
  existingReceipts,
  pendingFiles,
  onAddFiles,
  onRemovePending,
  onDeleteExisting,
  onClose,
}: {
  existingReceipts: ReceiptMeta[]
  pendingFiles: File[]
  onAddFiles?: (files: File[]) => void
  onRemovePending?: (index: number) => void
  onDeleteExisting?: (id: number) => Promise<void>
  onClose: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!onAddFiles) return
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length > 0) {
        e.preventDefault()
        onAddFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onAddFiles])

  // ESC 키로 라이트박스 또는 모달 닫기
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightbox, onClose])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (!onAddFiles) return
    const files: File[] = []
    for (const file of Array.from(e.dataTransfer.files)) {
      if (file.type.startsWith('image/')) files.push(file)
    }
    if (files.length > 0) onAddFiles(files)
  }

  const hasItems = existingReceipts.length > 0 || pendingFiles.length > 0

  return (
    <>
      {/* 라이트박스 — 원본 크기 보기 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-9 right-0 text-white/80 hover:text-white text-2xl leading-none"
            >✕</button>
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="max-w-[95vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="mt-2 text-xs text-white/60 truncate max-w-[90vw]">{lightbox.alt}</p>
          </div>
        </div>
      )}

      {/* 메인 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">영수증 관리</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          {/* 스크롤 영역 */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {hasItems && (
              <div className="grid grid-cols-2 gap-4">
                {existingReceipts.map(r => (
                  <div key={r.id} className="relative flex flex-col items-center gap-1.5 group">
                    <div
                      className="relative w-full cursor-zoom-in"
                      onClick={() => setLightbox({ src: `/api/receipts/${r.id}`, alt: r.filename })}
                    >
                      <img
                        src={`/api/receipts/${r.id}`}
                        alt={r.filename}
                        className="w-full h-52 object-contain rounded-lg border border-gray-200 bg-gray-50 group-hover:border-blue-300 transition-colors"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">🔍 원본 보기</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate w-full text-center px-1">{r.filename}</span>
                    {onDeleteExisting && (
                      <button
                        onClick={async (e) => { e.stopPropagation(); await onDeleteExisting(r.id) }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 shadow"
                      >×</button>
                    )}
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div key={index} className="relative flex flex-col items-center gap-1.5 group">
                    <div
                      className="relative w-full cursor-zoom-in"
                      onClick={() => setLightbox({ src: URL.createObjectURL(file), alt: file.name })}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-52 object-contain rounded-lg border border-gray-200 bg-gray-50 group-hover:border-blue-300 transition-colors"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">🔍 원본 보기</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate w-full text-center px-1">{file.name}</span>
                    {onRemovePending && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemovePending(index) }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 shadow"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {onAddFiles && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                  ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}`}
              >
                <span className="text-3xl text-gray-300">📋</span>
                <div className="text-center">
                  <p className="text-sm text-gray-500 font-medium">클립보드에서 붙여넣기 또는 파일 선택</p>
                  <p className="text-xs text-gray-400 mt-1">여기에 이미지를 끌어다 놓으세요</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (!onAddFiles) return
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) onAddFiles(files)
            e.target.value = ''
          }}
        />
      </div>
    </>
  )
}

export default function ExpensePageClient({ role, userLang, userId, userChurchId, churchCurrencyCode, initialAccountItems }: Props) {
  const t = useTranslations('expense')
  const tc = useTranslations('common')
  const { churchId: selectedChurchId, year, month } = useChurchStore()
  const locale = useLocale()
  const isAdmin = role === 'admin'
  const isRu = locale === 'ru'   // URL 로케일 기준 (한국어/러시아어 화면 전환)
  const churchId = isAdmin ? selectedChurchId : (userChurchId ?? selectedChurchId)

  const today = new Date().toISOString().slice(0, 10)

  // 관리자는 교회 선택이 바뀔 때 통화 코드를 동적으로 가져옴
  const [effectiveCurrencyCode, setEffectiveCurrencyCode] = useState(churchCurrencyCode)
  useEffect(() => {
    if (!isAdmin || !selectedChurchId) return
    fetch('/api/churches')
      .then(r => r.json())
      .then((list: { id: number; currencyCode: string }[]) => {
        const found = list.find(c => c.id === selectedChurchId)
        if (found) setEffectiveCurrencyCode(found.currencyCode)
      })
  }, [isAdmin, selectedChurchId])

  const availableCurrencies = [
    ...CURRENCIES.filter(c => c.code === effectiveCurrencyCode),
    ...CURRENCIES.filter(c => c.code === 'USD' && c.code !== effectiveCurrencyCode),
  ]

  const [records, setRecords] = useState<ExpenseRecord[]>([])
  const [accountItems] = useState<AccountItem[]>(initialAccountItems)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // 신규 영수증 상태
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // 편집 상태
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editImageFiles, setEditImageFiles] = useState<File[]>([])
  const [editExistingReceipts, setEditExistingReceipts] = useState<ReceiptMeta[]>([])
  const [showEditReceiptModal, setShowEditReceiptModal] = useState(false)

  // 읽기 전용 영수증 보기 상태
  const [viewReceipts, setViewReceipts] = useState<ReceiptMeta[]>([])
  const [showViewReceiptModal, setShowViewReceiptModal] = useState(false)

  // 자금이동 상태
  const [transfers, setTransfers] = useState<FundTransfer[]>([])
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transferDate, setTransferDate] = useState(today)
  const [transferType, setTransferType] = useState<FundTransferType>('bank_to_cash')
  const [transferAmountLocal, setTransferAmountLocal] = useState('')
  const [transferAmountUsd, setTransferAmountUsd] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferSaving, setTransferSaving] = useState(false)
  // 자금이동 수정 상태
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null)
  const [editTransferDate, setEditTransferDate] = useState('')
  const [editTransferType, setEditTransferType] = useState<FundTransferType>('bank_to_cash')
  const [editTransferAmountLocal, setEditTransferAmountLocal] = useState('')
  const [editTransferAmountUsd, setEditTransferAmountUsd] = useState('')
  const [editTransferNote, setEditTransferNote] = useState('')
  const [editTransferSaving, setEditTransferSaving] = useState(false)

  // 신규 입력 폼
  const { register, handleSubmit, reset, watch, setValue } = useForm<ExpenseFormData>({
    defaultValues: { date: today, currency: churchCurrencyCode, paymentMethod: 'bank' },
  })
  const selectedCode = watch('accountCode')
  const currency = watch('currency')

  // 편집 폼
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit, setValue: setEditValue } = useForm<ExpenseFormData>()
  const editCurrency = watchEdit('currency')
  const editCode = watchEdit('accountCode')

  async function load() {
    if (!churchId) return
    const url = month
      ? `/api/expenses?churchId=${churchId}&year=${year}&month=${month}`
      : `/api/expenses?churchId=${churchId}&year=${year}`
    const r = await fetch(url)
    setRecords(await r.json())
  }

  async function loadTransfers() {
    if (!churchId) return
    const url = month
      ? `/api/fund-transfers?churchId=${churchId}&year=${year}&month=${month}`
      : `/api/fund-transfers?churchId=${churchId}&year=${year}`
    const r = await fetch(url)
    setTransfers(await r.json())
  }

  useEffect(() => { load(); loadTransfers() }, [churchId, year, month])

  async function addTransfer() {
    if (!churchId || !transferDate) return
    setTransferSaving(true)
    try {
      await fetch('/api/fund-transfers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ churchId, date: transferDate, type: transferType, amountLocal: Number(transferAmountLocal) || 0, amountUsd: Number(transferAmountUsd) || 0, note: transferNote }),
      })
      setTransferDate(today)
      setTransferType('bank_to_cash')
      setTransferAmountLocal('')
      setTransferAmountUsd('')
      setTransferNote('')
      setShowTransferForm(false)
      await loadTransfers()
    } finally {
      setTransferSaving(false)
    }
  }

  async function deleteTransfer(id: number) {
    if (!window.confirm(t('deleteTransferConfirm'))) return
    await fetch(`/api/fund-transfers?id=${id}`, { method: 'DELETE' })
    await loadTransfers()
  }

  function startEditTransfer(t: FundTransfer) {
    setShowTransferForm(false)
    setEditingTransferId(t.id)
    setEditTransferDate(t.date)
    setEditTransferType(t.type)
    setEditTransferAmountLocal(String(t.amountLocal || ''))
    setEditTransferAmountUsd(String(t.amountUsd || ''))
    setEditTransferNote(t.note)
  }

  function cancelEditTransfer() {
    setEditingTransferId(null)
  }

  async function saveEditTransfer() {
    if (!editingTransferId) return
    setEditTransferSaving(true)
    try {
      await fetch('/api/fund-transfers', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: editingTransferId, date: editTransferDate, type: editTransferType, amountLocal: Number(editTransferAmountLocal) || 0, amountUsd: Number(editTransferAmountUsd) || 0, note: editTransferNote }),
      })
      setEditingTransferId(null)
      await loadTransfers()
    } finally {
      setEditTransferSaving(false)
    }
  }

  // 신규 영수증 헬퍼
  function addImageFiles(files: File[]) {
    setImageFiles(prev => [...prev, ...files])
  }
  function removePendingImage(index: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }
  function clearImages() {
    setImageFiles([])
  }

  // 편집 영수증 헬퍼
  function addEditImageFiles(files: File[]) {
    setEditImageFiles(prev => [...prev, ...files])
  }
  function removePendingEditImage(index: number) {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index))
  }
  async function deleteExistingReceipt(id: number) {
    await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
    setEditExistingReceipts(prev => prev.filter(r => r.id !== id))
  }
  function clearEditImages() {
    setEditImageFiles([])
    setEditExistingReceipts([])
  }

  function handleAccountChange(code: string) {
    const item = accountItems.find(a => a.code === code)
    if (item) {
      setValue('accountCode', item.code)
      setValue('accountNameKo', item.nameKo)
      setValue('accountNameRu', item.nameRu)
    }
  }
  function handleEditAccountChange(code: string) {
    const item = accountItems.find(a => a.code === code)
    if (item) {
      setEditValue('accountCode', item.code)
      setEditValue('accountNameKo', item.nameKo)
      setEditValue('accountNameRu', item.nameRu)
    }
  }

  // 신규 저장
  async function onSubmit(data: ExpenseFormData) {
    if (!churchId) { alert(t('noChurchSelected')); return }
    setSaving(true)
    try {
      const amountUsd = data.currency === 'USD' ? (data.amount || 0) : 0
      const amountLocal = data.currency !== 'USD' ? (data.amount || 0) : 0
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, churchId, amountUsd, amountLocal, createdBy: userId, receiptAttached: imageFiles.length > 0 }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`)
      const saved = await res.json()
      if (imageFiles.length > 0 && saved?.id) {
        for (const file of imageFiles) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('expenseRecordId', String(saved.id))
          await fetch('/api/receipts', { method: 'POST', body: fd })
        }
      }
      reset({ date: today, currency: effectiveCurrencyCode, paymentMethod: 'bank' })
      clearImages()
      setShowInlineForm(false)
      await load()
    } catch (e) {
      alert(t('saveFailed', { message: e instanceof Error ? e.message : tc('unknownError') }))
    } finally {
      setSaving(false)
    }
  }

  // 편집 시작
  function startEdit(r: ExpenseRecord) {
    setShowInlineForm(false)
    clearEditImages()
    setEditingId(r.id)
    const amount = r.currency === 'USD' ? r.amountUsd : r.amountLocal
    resetEdit({
      date: r.date,
      accountCode: r.accountCode,
      accountNameKo: r.accountNameKo,
      accountNameRu: r.accountNameRu,
      merchantKo: r.merchantKo,
      merchantRu: r.merchantRu,
      managerKo: r.managerKo,
      managerRu: r.managerRu,
      descriptionKo: r.descriptionKo,
      descriptionRu: r.descriptionRu,
      currency: r.currency || 'USD',
      paymentMethod: (r.paymentMethod as 'bank' | 'cash') || 'bank',
      amount,
    })
    // 기존 영수증 목록 조회
    fetch(`/api/receipts?expenseRecordId=${r.id}`)
      .then(res => res.json())
      .then((rows: ReceiptMeta[]) => setEditExistingReceipts(rows))
      .catch(() => {})
  }

  // 편집 저장
  async function onEditSubmit(data: ExpenseFormData) {
    if (!editingId) return
    setEditSaving(true)
    try {
      const amountUsd = data.currency === 'USD' ? (data.amount || 0) : 0
      const amountLocal = data.currency !== 'USD' ? (data.amount || 0) : 0
      const receiptAttached = editExistingReceipts.length > 0 || editImageFiles.length > 0
      const res = await fetch(`/api/expenses/${editingId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, amountUsd, amountLocal, receiptAttached }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`)
      if (editImageFiles.length > 0) {
        for (const file of editImageFiles) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('expenseRecordId', String(editingId))
          await fetch('/api/receipts', { method: 'POST', body: fd })
        }
      }
      setEditingId(null)
      clearEditImages()
      await load()
    } catch (e) {
      alert(t('editFailed', { message: e instanceof Error ? e.message : tc('unknownError') }))
    } finally {
      setEditSaving(false)
    }
  }

  // 삭제 (확인 포함)
  async function deleteRecord(id: number) {
    if (!window.confirm(t('deleteConfirm'))) return
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function confirmRecord(id: number, date: string) {
    if (!window.confirm(`${date} 지출을 확정하시겠습니까?`)) return
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    await load()
  }

  function openForm() {
    clearImages()
    setEditingId(null)
    reset({ date: today, currency: effectiveCurrencyCode, paymentMethod: 'bank' })
    setShowInlineForm(true)
  }
  function cancelForm() { clearImages(); setShowInlineForm(false) }

  const totalUsd = records.reduce((s, r) => s + (Number(r.amountUsd) || 0), 0)
  const totalLocal = records.reduce((s, r) => s + (Number(r.amountLocal) || 0), 0)
  const expenseAccounts = accountItems.filter(a => a.type === 'expense')
  // accountCode로 현재 계정과목 목록에서 이름 조회 — userLang(사용자 언어 설정) 기준
  const accountItemMap = new Map(accountItems.map(a => [a.code, a]))
  function getAccountName(r: ExpenseRecord) {
    const item = accountItemMap.get(r.accountCode)
    if (item) return isRu ? (item.nameRu || item.nameKo) : (item.nameKo || item.nameRu)
    return isRu ? (r.accountNameRu || r.accountNameKo) : (r.accountNameKo || r.accountNameRu)
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400'
  const cellCls = 'px-2 py-1.5 align-top'

  const pageTitle = month ? `${t('title')} - ${year}${tc('year')} ${month}${tc('month')}` : t('title')

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{pageTitle}</h2>
      <div className="flex items-center gap-3">
        <MonthPicker />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-orange-50 text-gray-600">
              <th className="px-3 py-2 text-left border-b border-gray-100 whitespace-nowrap">{tc('date')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100 whitespace-nowrap">{t('paymentMethod')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100 whitespace-nowrap">{tc('currency')}</th>
              <th className="px-3 py-2 text-left border-b border-gray-100 whitespace-nowrap">{t('manager')}</th>
              <th className="px-3 py-2 text-left border-b border-gray-100 whitespace-nowrap">{t('accountCode')}</th>
              <th className="px-3 py-2 text-left border-b border-gray-100 whitespace-nowrap">{t('merchant')}</th>
              <th className="px-3 py-2 text-left border-b border-gray-100 whitespace-nowrap">{t('description')}</th>
              <th className="px-3 py-2 text-right border-b border-gray-100 whitespace-nowrap">{tc('amount')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100 whitespace-nowrap">{tc('receipt')}</th>
              <th className="px-3 py-2 text-center border-b border-gray-100 whitespace-nowrap">{t('status')}</th>
              <th className="px-3 py-2 border-b border-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {/* 데이터 행 */}
            {records.length === 0 && !showInlineForm ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">{tc('noData')}</td></tr>
            ) : records.map(r => {
              const isEditing = editingId === r.id
              if (isEditing) {
                return (
                  <tr key={r.id} className="border-b border-amber-100 bg-amber-50/40">
                    <td className={cellCls} style={{ minWidth: 110 }}>
                      <input type="date" {...regEdit('date', { required: true })} className={inputCls} />
                    </td>
                    <td className={`${cellCls} text-center`} style={{ minWidth: 70 }}>
                      <select {...regEdit('paymentMethod')} className={inputCls}>
                        <option value="bank">{t('bank')}</option>
                        <option value="cash">{t('cash')}</option>
                      </select>
                    </td>
                    <td className={cellCls} style={{ minWidth: 90 }}>
                      <select {...regEdit('currency')} className={inputCls}>
                        {availableCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                    </td>
                    <td className={cellCls} style={{ minWidth: 100 }}>
                      <input {...regEdit(isRu ? 'managerRu' : 'managerKo')} className={inputCls} placeholder={`${t('manager')}...`} />
                    </td>
                    <td className={cellCls} style={{ minWidth: 130 }}>
                      <select value={editCode ?? ''} onChange={e => handleEditAccountChange(e.target.value)} className={inputCls}>
                        <option value="">{t('selectAccount')}</option>
                        {expenseAccounts.map(a => <option key={a.code} value={a.code}>{isRu ? (a.nameRu || a.nameKo) : (a.nameKo || a.nameRu)}</option>)}
                      </select>
                      <input type="hidden" {...regEdit('accountCode')} />
                      <input type="hidden" {...regEdit('accountNameKo')} />
                      <input type="hidden" {...regEdit('accountNameRu')} />
                    </td>
                    <td className={cellCls} style={{ minWidth: 110 }}>
                      <input {...regEdit(isRu ? 'merchantRu' : 'merchantKo')} className={inputCls} placeholder={`${t('merchant')}...`} />
                    </td>
                    <td className={cellCls} style={{ minWidth: 160 }}>
                      <input {...regEdit(isRu ? 'descriptionRu' : 'descriptionKo')} className={inputCls} placeholder={`${t('description')}...`} />
                    </td>
                    <td className={cellCls} style={{ minWidth: 100 }}>
                      <input type="number" step="0.01" min="0" {...regEdit('amount', { valueAsNumber: true })} className={`${inputCls} text-right`} placeholder="0.00" />
                    </td>
                    <td className={`${cellCls} text-center`}>
                      <button type="button" onClick={() => setShowEditReceiptModal(true)}
                        className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                          (editExistingReceipts.length + editImageFiles.length) > 0
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}>
                        📎{(editExistingReceipts.length + editImageFiles.length) > 0
                          ? ` ${editExistingReceipts.length + editImageFiles.length}`
                          : ''}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {r.status === 'confirmed'
                        ? <span className="text-xs text-green-600 font-medium">{t('confirmed')}</span>
                        : <span className="text-xs text-amber-500">{t('reviewing')}</span>}
                    </td>
                    <td className={`${cellCls} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={editSaving} onClick={handleEditSubmit(onEditSubmit)}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                          {editSaving ? tc('saving') : tc('save')}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500">✕</button>
                      </div>
                    </td>
                  </tr>
                )
              }

              // 일반 표시 행
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {r.paymentMethod === 'cash'
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">{t('cash')}</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">{t('bank')}</span>}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-500">{r.currency || 'USD'}</span>
                  </td>
                  <td className="px-3 py-2">{isRu ? (r.managerRu || r.managerKo || '-') : (r.managerKo || r.managerRu || '-')}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{getAccountName(r)}</td>
                  <td className="px-3 py-2">{isRu ? (r.merchantRu || r.merchantKo || '-') : (r.merchantKo || r.merchantRu || '-')}</td>
                  <td className="px-3 py-2">{isRu ? (r.descriptionRu || r.descriptionKo) : (r.descriptionKo || r.descriptionRu)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {fmt(Number(r.currency === 'USD' ? r.amountUsd : r.amountLocal))}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.receiptAttached
                      ? <button
                          onClick={() => {
                            fetch(`/api/receipts?expenseRecordId=${r.id}`)
                              .then(res => res.json())
                              .then((rows: ReceiptMeta[]) => { setViewReceipts(rows); setShowViewReceiptModal(true) })
                              .catch(() => {})
                          }}
                          className="text-green-500 hover:text-green-700 text-xs underline cursor-pointer"
                        >
                          ✓ 보기
                        </button>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {r.status === 'confirmed'
                      ? <span className="text-xs text-green-600 font-medium">{t('confirmed')}</span>
                      : <span className="text-xs text-amber-500">{t('reviewing')}</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      {isAdmin && r.status === 'draft' && (
                        <button onClick={() => confirmRecord(r.id, r.date)}
                          className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap">{t('confirmAction')}</button>
                      )}
                      <button onClick={() => startEdit(r)}
                        className="px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                        {tc('edit')}
                      </button>
                      <button onClick={() => deleteRecord(r.id)}
                        className="px-2 py-0.5 text-xs border border-red-200 rounded text-red-500 hover:bg-red-50 whitespace-nowrap">
                        {tc('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* 신규 입력 행 — 합계 바로 위 */}
            {showInlineForm && (
              <tr className="border-b border-blue-100 bg-blue-50/40">
                <td className={cellCls} style={{ minWidth: 110 }}>
                  <input type="date" {...register('date', { required: true })} className={inputCls} />
                </td>
                <td className={`${cellCls} text-center`} style={{ minWidth: 70 }}>
                  <select {...register('paymentMethod')} className={inputCls}>
                    <option value="bank">{t('bank')}</option>
                    <option value="cash">{t('cash')}</option>
                  </select>
                </td>
                <td className={cellCls} style={{ minWidth: 90 }}>
                  <select {...register('currency')} className={inputCls}>
                    {availableCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </td>
                <td className={cellCls} style={{ minWidth: 100 }}>
                  <input {...register(isRu ? 'managerRu' : 'managerKo')} className={inputCls} placeholder={`${t('manager')}...`} />
                </td>
                <td className={cellCls} style={{ minWidth: 130 }}>
                  <select value={selectedCode ?? ''} onChange={e => handleAccountChange(e.target.value)} className={inputCls}>
                    <option value="">{t('selectAccount')}</option>
                    {expenseAccounts.map(a => <option key={a.code} value={a.code}>{isRu ? (a.nameRu || a.nameKo) : (a.nameKo || a.nameRu)}</option>)}
                  </select>
                  <input type="hidden" {...register('accountCode')} />
                  <input type="hidden" {...register('accountNameKo')} />
                  <input type="hidden" {...register('accountNameRu')} />
                </td>
                <td className={cellCls} style={{ minWidth: 110 }}>
                  <input {...register(isRu ? 'merchantRu' : 'merchantKo')} className={inputCls} placeholder={`${t('merchant')}...`} />
                </td>
                <td className={cellCls} style={{ minWidth: 160 }}>
                  <input {...register(isRu ? 'descriptionRu' : 'descriptionKo')} className={inputCls} placeholder={`${t('description')}...`} />
                </td>
                <td className={cellCls} style={{ minWidth: 100 }}>
                  <input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} className={`${inputCls} text-right`} placeholder="0.00" />
                </td>
                <td className={`${cellCls} text-center`}>
                  <button type="button" onClick={() => setShowReceiptModal(true)}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      imageFiles.length > 0
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}>
                    📎{imageFiles.length > 0 ? ` ${imageFiles.length}` : ''}
                  </button>
                </td>
                <td className={cellCls}></td>
                <td className={`${cellCls} whitespace-nowrap`}>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={saving} onClick={handleSubmit(onSubmit)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {saving ? tc('saving') : tc('save')}
                    </button>
                    <button type="button" onClick={cancelForm}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500">✕</button>
                  </div>
                </td>
              </tr>
            )}

            {/* 합계 행 */}
            {records.length > 0 && (
              <tr className="bg-amber-50 font-medium">
                <td colSpan={5} className="px-3 py-2">{tc('total')}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">—</td>
                <td className="px-3 py-2 text-right">
                  {totalUsd > 0 && totalLocal > 0
                    ? <span className="text-xs">${fmt(totalUsd)} + {fmt(totalLocal)}</span>
                    : totalUsd > 0 ? `$${fmt(totalUsd)}`
                    : totalLocal > 0 ? fmt(totalLocal)
                    : '-'}
                </td>
                <td colSpan={4}></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={showInlineForm ? cancelForm : openForm}
            className={`px-3 py-1.5 text-xs rounded-md ${showInlineForm ? 'border border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {showInlineForm ? `✕ ${tc('cancel')}` : `+ ${t('addRecord')}`}
          </button>
        </div>
      </div>

      {showReceiptModal && (
        <ReceiptModal
          existingReceipts={[]}
          pendingFiles={imageFiles}
          onAddFiles={addImageFiles}
          onRemovePending={removePendingImage}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
      {showEditReceiptModal && (
        <ReceiptModal
          existingReceipts={editExistingReceipts}
          pendingFiles={editImageFiles}
          onAddFiles={addEditImageFiles}
          onRemovePending={removePendingEditImage}
          onDeleteExisting={deleteExistingReceipt}
          onClose={() => setShowEditReceiptModal(false)}
        />
      )}
      {showViewReceiptModal && (
        <ReceiptModal
          existingReceipts={viewReceipts}
          pendingFiles={[]}
          onClose={() => setShowViewReceiptModal(false)}
        />
      )}

      {/* ── 자금이동 섹션 ── */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{t('fundTransferTitle')}</h3>
        </div>

        {transfers.length === 0 && !showTransferForm ? (
          <div className="px-4 py-5 text-center text-xs text-gray-400">{t('noTransfers')}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-3 py-2 text-left font-medium border-b border-gray-100">{tc('date')}</th>
                <th className="px-3 py-2 text-left font-medium border-b border-gray-100">{t('transferType')}</th>
                <th className="px-3 py-2 text-right font-medium border-b border-gray-100">{tc('local')}</th>
                <th className="px-3 py-2 text-right font-medium border-b border-gray-100">{tc('usd')}</th>
                <th className="px-3 py-2 text-left font-medium border-b border-gray-100">{tc('notes')}</th>
                <th className="px-3 py-2 border-b border-gray-100"></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(tr => {
                const isEditing = editingTransferId === tr.id
                const inCls = 'border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400'
                const fmtAmt = (n: number) => n ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
                if (isEditing) return (
                  <tr key={tr.id} className="border-b border-amber-100 bg-amber-50/40">
                    <td className="px-2 py-1.5">
                      <input type="date" value={editTransferDate} onChange={e => setEditTransferDate(e.target.value)} className={inCls} style={{ minWidth: 115 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={editTransferType} onChange={e => { setEditTransferType(e.target.value as FundTransferType); setEditTransferAmountLocal(''); setEditTransferAmountUsd('') }} className={inCls} style={{ minWidth: 155 }}>
                        <option value="bank_to_cash">{t('bankToCash')}</option>
                        <option value="cash_to_bank">{t('cashToBank')}</option>
                        <option value="cash_to_usd">{t('cashToUsd')}</option>
                        <option value="usd_to_cash">{t('usdToCash')}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" step="0.01" min="0" value={editTransferAmountLocal} onChange={e => setEditTransferAmountLocal(e.target.value)}
                        placeholder={tc('local')} className={`${inCls} text-right w-24`} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" step="0.01" min="0" value={editTransferAmountUsd} onChange={e => setEditTransferAmountUsd(e.target.value)}
                        placeholder="USD" className={`${inCls} text-right w-24`}
                        disabled={editTransferType === 'bank_to_cash' || editTransferType === 'cash_to_bank'} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="space-y-1">
                        <input type="text" value={editTransferNote} onChange={e => setEditTransferNote(e.target.value)} placeholder={tc('notes')} className={`${inCls} w-28`} />
                        {(editTransferType === 'cash_to_usd' || editTransferType === 'usd_to_cash') &&
                          Number(editTransferAmountLocal) > 0 && Number(editTransferAmountUsd) > 0 && (
                          <div className="text-[10px] text-purple-500 font-medium">
                            1 USD = {(Number(editTransferAmountLocal) / Number(editTransferAmountUsd)).toLocaleString('en-US', { maximumFractionDigits: 0 })} {effectiveCurrencyCode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={saveEditTransfer} disabled={editTransferSaving}
                          className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                          {editTransferSaving ? tc('saving') : tc('save')}
                        </button>
                        <button onClick={cancelEditTransfer} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500">✕</button>
                      </div>
                    </td>
                  </tr>
                )
                return (
                  <tr key={tr.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{tr.date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {{
                        bank_to_cash: <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">{t('bankToCash')}</span>,
                        cash_to_bank: <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">{t('cashToBank')}</span>,
                        cash_to_usd:  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{t('cashToUsd')}</span>,
                        usd_to_cash:  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{t('usdToCash')}</span>,
                      }[tr.type]}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium">
                      <div>{fmtAmt(tr.amountLocal)}</div>
                      {(tr.type === 'cash_to_usd' || tr.type === 'usd_to_cash') && tr.exchangeRate > 0 && (
                        <div className="text-[10px] text-purple-400 font-normal">1 USD = {tr.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 0 })} {effectiveCurrencyCode}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{fmtAmt(tr.amountUsd)}</td>
                    <td className="px-3 py-2 text-gray-500">{tr.note || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button onClick={() => startEditTransfer(tr)} className="px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100">{tc('edit')}</button>
                        <button onClick={() => deleteTransfer(tr.id)} className="px-2 py-0.5 text-xs border border-red-200 rounded text-red-500 hover:bg-red-50">{tc('delete')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {showTransferForm && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-indigo-50/40 border-t border-indigo-100">
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              style={{ minWidth: 120 }}
            />
            <select
              value={transferType}
              onChange={e => { setTransferType(e.target.value as FundTransferType); setTransferAmountLocal(''); setTransferAmountUsd('') }}
              className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              style={{ minWidth: 160 }}
            >
              <option value="bank_to_cash">{t('bankToCash')}</option>
              <option value="cash_to_bank">{t('cashToBank')}</option>
              <option value="cash_to_usd">{t('cashToUsd')}</option>
              <option value="usd_to_cash">{t('usdToCash')}</option>
            </select>
            {(transferType === 'cash_to_usd' || transferType === 'usd_to_cash') ? (<>
              <input type="number" step="0.01" min="0" value={transferType === 'cash_to_usd' ? transferAmountLocal : transferAmountUsd}
                onChange={e => transferType === 'cash_to_usd' ? setTransferAmountLocal(e.target.value) : setTransferAmountUsd(e.target.value)}
                placeholder={transferType === 'cash_to_usd' ? `${tc('local')} (${effectiveCurrencyCode})` : 'USD'}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right" style={{ minWidth: 110 }} />
              <span className="text-gray-400 text-xs">→</span>
              <input type="number" step="0.01" min="0" value={transferType === 'cash_to_usd' ? transferAmountUsd : transferAmountLocal}
                onChange={e => transferType === 'cash_to_usd' ? setTransferAmountUsd(e.target.value) : setTransferAmountLocal(e.target.value)}
                placeholder={transferType === 'cash_to_usd' ? 'USD' : `${tc('local')} (${effectiveCurrencyCode})`}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right" style={{ minWidth: 110 }} />
            </>) : (
              <input type="number" step="0.01" min="0" value={transferAmountLocal}
                onChange={e => setTransferAmountLocal(e.target.value)}
                placeholder={`${tc('amount')} (${effectiveCurrencyCode})`}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right" style={{ minWidth: 130 }} />
            )}
            {(transferType === 'cash_to_usd' || transferType === 'usd_to_cash') &&
              Number(transferAmountLocal) > 0 && Number(transferAmountUsd) > 0 && (
              <span className="text-xs text-purple-600 font-medium whitespace-nowrap bg-purple-50 px-2 py-1.5 rounded border border-purple-100">
                1 USD = {(Number(transferAmountLocal) / Number(transferAmountUsd)).toLocaleString('en-US', { maximumFractionDigits: 0 })} {effectiveCurrencyCode}
              </span>
            )}
            <input
              type="text"
              value={transferNote}
              onChange={e => setTransferNote(e.target.value)}
              placeholder={`${tc('notes')} (${tc('optional')})`}
              className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1"
              style={{ minWidth: 120 }}
            />
            <button
              onClick={addTransfer}
              disabled={transferSaving}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {transferSaving ? tc('saving') : tc('save')}
            </button>
          </div>
        )}
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setShowTransferForm(v => !v)}
            className={`px-3 py-1.5 text-xs rounded-md ${showTransferForm ? 'border border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {showTransferForm ? `✕ ${tc('cancel')}` : `+ ${t('addFundTransfer')}`}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useChurchStore } from '@/lib/store'

interface Church {
  id: number
  churchNumber: number | null
  nameKo: string
  nameRu: string
  currencyCode: string
  country: string
}

export default function ChurchSelector() {
  const t = useTranslations('common')
  const [churches, setChurches] = useState<Church[]>([])
  const { churchId, setChurchId } = useChurchStore()

  useEffect(() => {
    fetch('/api/churches')
      .then(r => r.json())
      .then((data: Church[]) => {
        setChurches(data)
        if (!churchId && data.length > 0) setChurchId(data[0].id)
      })
      .catch(() => {})
  }, [churchId, setChurchId])

  return (
    <select
      value={churchId ?? ''}
      onChange={e => setChurchId(Number(e.target.value))}
      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="" disabled>{t('selectChurch')}</option>
      {churches.map(c => (
        <option key={c.id} value={c.id}>
          {c.churchNumber != null ? `${c.churchNumber}. ${c.nameKo}` : c.nameKo}
        </option>
      ))}
    </select>
  )
}

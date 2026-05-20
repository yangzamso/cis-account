import { getTranslations } from 'next-intl/server'
import TitheReserveClient from '@/components/reports/TitheReserveClient'

export default async function TitheReservePage() {
  const t = await getTranslations('titheReserve')
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">{t('title')}</h2>
      <TitheReserveClient />
    </div>
  )
}

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ExchangeRatesClient from '@/components/admin/ExchangeRatesClient'

export default async function ExchangeRatesPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">환율 관리</h2>
      <ExchangeRatesClient />
    </div>
  )
}

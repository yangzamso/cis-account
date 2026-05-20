import { auth } from '@/auth'
import { db } from '@/db'
import { churches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import BalanceSummaryClient from '@/components/BalanceSummaryClient'

export default async function BalancePage() {
  const session = await auth()
  const user = session?.user
  const isAdmin = user?.role === 'admin'

  let churchCurrencyCode = 'USD'
  if (user?.churchId) {
    const [church] = await db.select({ currencyCode: churches.currencyCode })
      .from(churches).where(eq(churches.id, Number(user.churchId)))
    if (church) churchCurrencyCode = church.currencyCode
  }

  return (
    <BalanceSummaryClient
      isAdmin={isAdmin}
      userChurchId={user?.churchId ? Number(user.churchId) : null}
      churchCurrencyCode={churchCurrencyCode}
    />
  )
}

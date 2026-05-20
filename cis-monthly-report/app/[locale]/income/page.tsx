import { auth } from '@/auth'
import { db } from '@/db'
import { churches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import IncomePageClient from '@/components/forms/IncomePageClient'

export default async function IncomePage() {
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
    <div>
      <IncomePageClient
        isAdmin={isAdmin}
        churchCurrencyCode={churchCurrencyCode}
      />
    </div>
  )
}

import { auth } from '@/auth'
import { db } from '@/db'
import { accountItems, churches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import ExpensePageClient from '@/components/forms/ExpensePageClient'

export default async function ExpensesPage() {
  const [session, allAccountItems] = await Promise.all([
    auth(),
    db.select().from(accountItems).orderBy(accountItems.sortOrder),
  ])
  const user = session?.user

  let churchCurrencyCode = 'USD'
  if (user?.churchId) {
    const [church] = await db.select({ currencyCode: churches.currencyCode })
      .from(churches).where(eq(churches.id, Number(user.churchId)))
    if (church) churchCurrencyCode = church.currencyCode
  }

  return (
    <div>
      <ExpensePageClient
        role={(user?.role ?? 'member') as 'admin' | 'member'}
        userLang={(user?.lang ?? 'ko') as 'ko' | 'ru'}
userId={Number(user?.id ?? 0)}
        userChurchId={user?.churchId ?? null}
        churchCurrencyCode={churchCurrencyCode}
        initialAccountItems={allAccountItems}
      />
    </div>
  )
}

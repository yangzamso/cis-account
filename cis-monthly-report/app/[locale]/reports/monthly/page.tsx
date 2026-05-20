import { auth } from '@/auth'
import MonthlyReportClient from '@/components/reports/MonthlyReportClient'

export default async function MonthlyReportPage() {
  const session = await auth()
  const user = session?.user
  const userLang = (user?.lang ?? 'ko') as 'ko' | 'ru'
  const role = (user?.role ?? 'member') as 'admin' | 'member'
  const userChurchId = user?.churchId ? Number(user.churchId) : null

  return (
    <div>
      <MonthlyReportClient
        userLang={userLang}
        role={role}
        userChurchId={userChurchId}
      />
    </div>
  )
}

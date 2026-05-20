import { auth } from '@/auth'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
  const session = await auth()
  const user = session?.user
  const role = (user?.role ?? 'member') as 'admin' | 'member'
  const userChurchId = user?.churchId ? Number(user.churchId) : null

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">교회 관리</h2>
      <SettingsClient role={role} userChurchId={userChurchId} />
    </div>
  )
}

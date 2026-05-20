'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signOut, useSession } from 'next-auth/react'
import LangToggle from './LangToggle'
import ChurchSelector from './ChurchSelector'

const NAV_GROUPS = [
  [
    { key: 'income', href: '/income', adminOnly: false },
    { key: 'expenses', href: '/expenses', adminOnly: false },
  ],
  [
    { key: 'balance', href: '/balance', adminOnly: false },
  ],
  [
    { key: 'monthlyReport', href: '/reports/monthly', adminOnly: false },
    { key: 'titheReserve', href: '/reports/tithe-reserve', adminOnly: false },
    { key: 'dashboard', href: '', adminOnly: false },
  ],
  [
    { key: 'exchangeRates', href: '/exchange-rates', adminOnly: true },
    { key: 'settings', href: '/settings', adminOnly: false },
  ],
] as const

export default function Sidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-sm font-bold text-gray-800 leading-tight">
          {tc('appTitle')}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Финансы церкви</p>
      </div>

      {isAdmin && (
        <div className="p-3 border-b border-gray-100">
          <ChurchSelector />
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <hr className="mx-3 my-1 border-gray-200" />}
            {group.filter(({ adminOnly }) => !adminOnly || isAdmin).map(({ key, href }) => {
              const fullHref = `/${locale}${href}`
              const isActive = href === ''
                ? pathname === `/${locale}` || pathname === `/${locale}/`
                : pathname.startsWith(fullHref)
              return (
                <Link
                  key={key}
                  href={fullHref}
                  className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {t(key)}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200">
        {user && (
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{user.nameKo}</p>
              <p className="text-xs text-gray-400">
                {isAdmin ? tc('roleAdmin') : tc('roleMember')}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="ml-2 shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              {tc('logout')}
            </button>
          </div>
        )}
        <div className="px-3 pb-3">
          <LangToggle locale={locale} />
        </div>
      </div>
    </aside>
  )
}

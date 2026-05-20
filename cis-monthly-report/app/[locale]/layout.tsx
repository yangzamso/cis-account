import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'
import Sidebar from '@/components/layout/Sidebar'
import SessionProvider from '@/components/layout/SessionProvider'
import '../globals.css'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as 'ko' | 'ru')) notFound()

  const messages = await getMessages()

  return (
    <SessionProvider>
      <NextIntlClientProvider messages={messages}>
        <div className="h-full flex bg-gray-50">
          <Sidebar locale={locale} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </NextIntlClientProvider>
    </SessionProvider>
  )
}

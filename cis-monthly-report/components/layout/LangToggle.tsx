'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function LangToggle({ locale }: { locale: string }) {
  const pathname = usePathname()
  const router = useRouter()

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

  return (
    <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs w-full">
      <button
        onClick={() => switchLocale('ko')}
        className={`flex-1 py-1.5 font-medium transition-colors ${
          locale === 'ko' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        KO · 한국어
      </button>
      <button
        onClick={() => switchLocale('ru')}
        className={`flex-1 py-1.5 font-medium transition-colors ${
          locale === 'ru' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        RU · Рус
      </button>
    </div>
  )
}

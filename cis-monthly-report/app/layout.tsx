import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CIS 지역 재정관리',
  description: 'CIS 해외교회 재정관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '割り勘',
  description: '旅行グループの支出を記録・精算するアプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

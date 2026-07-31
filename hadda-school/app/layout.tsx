import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import ToastProvider from '@/components/ui/ToastProvider'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Abdullahi Bin Masuud Academy',
  description: 'Where Every Heart Finds Its Verse — Quran Memorization School Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} h-full`}>
      <body className="font-sans antialiased bg-coffee-100 text-coffee-900 min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

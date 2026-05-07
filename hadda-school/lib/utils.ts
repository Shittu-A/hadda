import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function generateAdmissionNumber(year: number, sequence: number) {
  return `HMS-${year}-${String(sequence).padStart(4, '0')}`
}

export function youtubeToEmbed(url: string): string {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  return url
}

export function formatCurrency(amount: number | string, symbol = '₦') {
  return `${symbol}${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Tarihi Türkçe formatlar */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** Hafta aralığını formatlar */
export function formatWeekRange(startDate: Date | string, endDate: Date | string): string {
  const start = new Date(startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
  const end = new Date(endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${start} – ${end}`
}

/** Sayıyı Türkçe biçimlendirir */
export function formatNumber(n: number): string {
  return n.toLocaleString('tr-TR')
}

/** Yüzdeyi formatlar */
export function formatPercent(n: number, decimals = 1): string {
  return `%${n.toFixed(decimals)}`
}

/** İki sayı arasındaki değişim yüzdesini hesaplar */
export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/** Puan hesaplar: participantCount * weight */
export function calcScore(participantCount: number, weight: number): number {
  return participantCount * weight
}

/** X saat önce formatı */
export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days} gün önce`
  }
  if (hours >= 1) return `${hours} saat önce`
  if (minutes >= 1) return `${minutes} dakika önce`
  return 'Az önce'
}

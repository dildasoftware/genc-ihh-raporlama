/**
 * Rapor Arşivi — üretilen her rapor/karne/AI analizi kalıcı kayıttır.
 *
 * Saklama stratejisi: PDF dosyası DEĞİL, verinin anlık görüntüsü (snapshot).
 * Rapor sonradan açıldığında snapshot'tan birebir yeniden render edilir ve
 * tekrar PDF'e basılabilir. Avantajı: blob depolama yok, içerik aranabilir,
 * her sayı kaynağına izlenebilir kalır.
 */

// ==================== TÜRLER ====================

export type ReportType = 'KARNE' | 'HAFTALIK' | 'BOLGE' | 'ULKE' | 'KARSILASTIRMA'
export type ScopeType = 'PROVINCE' | 'REGION' | 'COUNTRY'

export interface ReportTypeDef {
  key: ReportType
  label: string
  description: string
  color: string
  bg: string
}

export const REPORT_TYPES: ReportTypeDef[] = [
  { key: 'KARNE', label: 'İl Karnesi', description: 'Bir ilin 5 boyutlu yıllık karnesi', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'HAFTALIK', label: 'Haftalık Rapor', description: 'Bir haftanın faaliyet raporu', color: '#16A34A', bg: '#F0FDF4' },
  { key: 'BOLGE', label: 'Bölge Raporu', description: 'Bölge geneli performans', color: '#D97706', bg: '#FFFBEB' },
  { key: 'ULKE', label: 'Ülke Raporu', description: 'Türkiye geneli özet', color: '#BE185D', bg: '#FDF2F8' },
  { key: 'KARSILASTIRMA', label: 'Karşılaştırma', description: 'İl/bölge kıyas raporu', color: '#7C3AED', bg: '#F5F3FF' },
]

export const REPORT_TYPE_BY_KEY = Object.fromEntries(
  REPORT_TYPES.map(r => [r.key, r])
) as Record<ReportType, ReportTypeDef>

export function reportTypeDef(key: string): ReportTypeDef {
  return REPORT_TYPE_BY_KEY[key as ReportType] ?? {
    key: key as ReportType, label: key, description: '', color: '#64748B', bg: '#F8FAFC',
  }
}

// ==================== AI ANALİZ TÜRLERİ ====================

export const AI_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  KARNE:          { label: 'Karne Analizi', color: '#2563EB', bg: '#EFF6FF' },
  HAFTALIK_RAPOR: { label: 'Haftalık Analiz', color: '#16A34A', bg: '#F0FDF4' },
  KARSILASTIRMA:  { label: 'Karşılaştırma Analizi', color: '#7C3AED', bg: '#F5F3FF' },
  TREND:          { label: 'Trend Analizi', color: '#D97706', bg: '#FFFBEB' },
  IL_BIRIM:       { label: 'İl/Birim Analizi', color: '#BE185D', bg: '#FDF2F8' },
  SERBEST:        { label: 'Serbest Analiz', color: '#0891B2', bg: '#ECFEFF' },
}

export function aiTypeDef(key: string) {
  return AI_TYPES[key] ?? { label: key, color: '#64748B', bg: '#F8FAFC' }
}

// ==================== KARNE SNAPSHOT ====================

/** Kartta gösterilen KPI özeti — tam snapshot açmadan okunur */
export interface KarneSummary {
  grade: string
  gradeLabel: string
  gradeColor: string
  total: number
  rank: number
  nationalCount: number
  totalParticipants: number
  institutionCount: number
  activeWeeks: number
  totalWeeks: number
}

export function buildKarneSummary(karne: any, nationalCount: number): KarneSummary {
  return {
    grade: karne.grade.letter,
    gradeLabel: karne.grade.label,
    gradeColor: karne.grade.color,
    total: karne.total,
    rank: karne.rank,
    nationalCount,
    totalParticipants: karne.totalParticipants,
    institutionCount: karne.institutionCount,
    activeWeeks: karne.activeWeeks,
    totalWeeks: karne.totalWeeks,
  }
}

/** Karne başlığı — arşiv listesinde görünen metin */
export function buildKarneTitle(provinceName: string, year: number, gender?: string | null) {
  const kol = gender === 'K' ? ' · Kadın Kolu' : gender === 'E' ? ' · Erkek Kolu' : ''
  return `${provinceName} İl Karnesi — ${year}${kol}`
}

// ==================== ARŞİV KAYIT TİPİ (birleşik görünüm) ====================

/**
 * Arşiv ekranı hem Report hem AiInsight kayıtlarını tek listede gösterir.
 * İkisi de bu şekle normalize edilir.
 */
export interface ArchiveItem {
  id: string
  kind: 'REPORT' | 'AI'
  type: string
  typeLabel: string
  color: string
  bg: string
  title: string
  scopeType: string | null
  scopeId: number | null
  scopeName: string | null
  year: number | null
  genderScope?: string | null
  summary: any | null
  /** AI analizlerinde yanıtın ilk satırları */
  excerpt?: string | null
  generatedAt: string
  generatedByName: string
  isArchived: boolean
}

export function gradeLabel(g?: string | null) {
  return g ?? '—'
}

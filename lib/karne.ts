/**
 * GENÇ İHH — Karne Puanlama Motoru
 *
 * Karne tek bir "puan" değildir; 5 boyutlu bir değerlendirmedir.
 * Her boyut 0–100 arası normalize edilir, ağırlıklandırılır ve harf notuna çevrilir.
 * Tüm girdiler Activity tablosundan (haftalık soru formu) ve ProvinceReport
 * künyesinden gelir — elle girilen puan yoktur.
 */

// ==================== BOYUTLAR ====================

export type DimensionKey = 'faaliyet' | 'katilim' | 'kapsam' | 'süreklilik' | 'teskilat'

export interface DimensionDef {
  key: DimensionKey
  label: string
  /** Toplam puandaki ağırlığı (%) */
  weight: number
  color: string
  description: string
}

export const DIMENSIONS: DimensionDef[] = [
  {
    key: 'faaliyet',
    label: 'Faaliyet Yoğunluğu',
    weight: 30,
    // Doğrulanmış grafik paleti — gerekçe için lib/chart-colors.ts
    color: '#2563EB',
    description: 'Ağırlıklı faaliyet puanı — faaliyet türünün önemi × katılımcı sayısı',
  },
  {
    key: 'katilim',
    label: 'Katılım',
    weight: 25,
    color: '#16A34A',
    description: 'Toplam katılımcı sayısı — sahadaki gerçek insan hacmi',
  },
  {
    key: 'kapsam',
    label: 'Kapsam',
    weight: 20,
    color: '#D97706',
    description: 'Kaç farklı kurumda (üniversite/lise/ortaokul) çalışma yapıldığı',
  },
  {
    key: 'süreklilik',
    label: 'Süreklilik',
    weight: 15,
    color: '#BE185D',
    description: 'Kaç haftada düzenli rapor girildiği — istikrar göstergesi',
  },
  {
    key: 'teskilat',
    label: 'Teşkilat',
    weight: 10,
    color: '#7C3AED',
    description: 'Dolu kadro oranı ve ilçe yayılımı',
  },
]

export const DIMENSION_BY_KEY = Object.fromEntries(
  DIMENSIONS.map(d => [d.key, d])
) as Record<DimensionKey, DimensionDef>

// ==================== HAM METRİKLER ====================

/** Bir ilin normalize edilmemiş ham ölçümleri */
export interface ProvinceMetrics {
  provinceId: number
  provinceName: string
  regionName: string

  /** Σ katılımcı × faaliyet ağırlığı */
  weightedScore: number
  totalParticipants: number
  totalActivities: number
  /** Çalışma yapılan farklı kurum sayısı */
  institutionCount: number
  /** Rapor girilen hafta sayısı */
  activeWeeks: number
  /** Dönemdeki toplam hafta */
  totalWeeks: number
  /** Dolu teşkilat kadrosu */
  orgFilled: number
  orgTotal: number
  /** Genç İHH'nın bulunduğu ilçe / toplam ilçe */
  activeDistricts: number
  totalDistricts: number
}

/** Normalize için tüm illerin tepe değerleri */
export interface Maxima {
  weightedScore: number
  totalParticipants: number
  institutionCount: number
}

export function computeMaxima(all: ProvinceMetrics[]): Maxima {
  return {
    weightedScore: Math.max(1, ...all.map(m => m.weightedScore)),
    totalParticipants: Math.max(1, ...all.map(m => m.totalParticipants)),
    institutionCount: Math.max(1, ...all.map(m => m.institutionCount)),
  }
}

// ==================== PUANLAMA ====================

const clamp100 = (n: number) => Math.max(0, Math.min(100, n))

/** Oranı 0–100'e çevirir; payda 0 ise 0 döner */
const ratio = (a: number, b: number) => (b > 0 ? clamp100((a / b) * 100) : 0)

export interface KarneResult {
  scores: Record<DimensionKey, number>
  /** Ağırlıklı toplam, 0–100 */
  total: number
  grade: Grade
}

/**
 * Ham ölçümleri 5 boyutlu karneye çevirir.
 * Faaliyet/katılım/kapsam en iyi ile kıyaslanarak (rölatif),
 * süreklilik ve teşkilat kendi hedefine göre (mutlak) puanlanır.
 */
export function computeKarne(m: ProvinceMetrics, max: Maxima): KarneResult {
  const scores: Record<DimensionKey, number> = {
    faaliyet: ratio(m.weightedScore, max.weightedScore),
    katilim: ratio(m.totalParticipants, max.totalParticipants),
    kapsam: ratio(m.institutionCount, max.institutionCount),
    süreklilik: ratio(m.activeWeeks, m.totalWeeks),
    teskilat:
      // Kadro doluluğu ve ilçe yayılımının ortalaması
      m.totalDistricts > 0
        ? (ratio(m.orgFilled, m.orgTotal) + ratio(m.activeDistricts, m.totalDistricts)) / 2
        : ratio(m.orgFilled, m.orgTotal),
  }

  const total = DIMENSIONS.reduce(
    (sum, d) => sum + (scores[d.key] * d.weight) / 100,
    0
  )

  return { scores, total: Math.round(total * 10) / 10, grade: toGrade(total) }
}

// ==================== HARF NOTU ====================

export interface Grade {
  letter: string
  label: string
  color: string
  bg: string
}

const GRADE_SCALE: { min: number; grade: Grade }[] = [
  { min: 85, grade: { letter: 'AA', label: 'Mükemmel',   color: '#15803D', bg: '#DCFCE7' } },
  { min: 70, grade: { letter: 'BA', label: 'Çok İyi',    color: '#16A34A', bg: '#F0FDF4' } },
  { min: 55, grade: { letter: 'BB', label: 'İyi',        color: '#0891B2', bg: '#ECFEFF' } },
  { min: 40, grade: { letter: 'CB', label: 'Orta',       color: '#D97706', bg: '#FFFBEB' } },
  { min: 25, grade: { letter: 'CC', label: 'Geliştirilmeli', color: '#EA580C', bg: '#FFF7ED' } },
  { min: 0,  grade: { letter: 'DC', label: 'Yetersiz',   color: '#DC2626', bg: '#FEF2F2' } },
]

export function toGrade(total: number): Grade {
  return (GRADE_SCALE.find(g => total >= g.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).grade
}

// ==================== YORUM ÜRETİMİ ====================

/**
 * Karneyi okunabilir tespitlere çevirir — AI'sız, deterministik.
 * "Doğru yönlendirme" için güçlü/zayıf yönleri açıkça söyler.
 */
export interface Insight {
  kind: 'güçlü' | 'zayıf' | 'nötr'
  text: string
}

export function buildInsights(m: ProvinceMetrics, r: KarneResult, rank: number, total: number): Insight[] {
  const out: Insight[] = []
  const entries = DIMENSIONS.map(d => ({ d, score: r.scores[d.key] }))
  const best = [...entries].sort((a, b) => b.score - a.score)[0]
  const worst = [...entries].sort((a, b) => a.score - b.score)[0]

  out.push({
    kind: rank <= Math.ceil(total * 0.25) ? 'güçlü' : rank > Math.floor(total * 0.75) ? 'zayıf' : 'nötr',
    text: `${total} il içinde ${rank}. sırada, ${r.grade.letter} (${r.grade.label}) notuyla.`,
  })

  if (best.score > 0) {
    out.push({
      kind: 'güçlü',
      text: `En güçlü yön: ${best.d.label} (${Math.round(best.score)}/100).`,
    })
  }

  if (worst.score < 50) {
    out.push({
      kind: 'zayıf',
      text: `Öncelikli gelişim alanı: ${worst.d.label} (${Math.round(worst.score)}/100).`,
    })
  }

  if (m.totalWeeks > 0 && m.activeWeeks < m.totalWeeks * 0.5) {
    out.push({
      kind: 'zayıf',
      text: `${m.totalWeeks} haftanın yalnızca ${m.activeWeeks} haftasında rapor girilmiş — veri akışı düzensiz.`,
    })
  }

  if (m.orgTotal > 0 && m.orgFilled < m.orgTotal * 0.5) {
    out.push({
      kind: 'zayıf',
      text: `Teşkilat kadrosunun ${m.orgFilled}/${m.orgTotal}'i dolu — kadro tamamlanmalı.`,
    })
  }

  if (m.institutionCount > 0 && m.totalParticipants > 0) {
    out.push({
      kind: 'nötr',
      text: `${m.institutionCount} farklı kurumda toplam ${m.totalParticipants.toLocaleString('tr-TR')} katılımcıya ulaşıldı (kurum başına ort. ${Math.round(m.totalParticipants / m.institutionCount)} kişi).`,
    })
  }

  return out
}

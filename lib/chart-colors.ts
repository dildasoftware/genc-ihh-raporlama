/**
 * Grafik paleti — TEK kaynak.
 *
 * ÖNEMLİ: UI krom renkleri (İHH yeşili #0E7A3C, koyu yeşil #0A1F14 —
 * buton, başlık, sidebar) burada YOK ve veri markı olarak KULLANILMAZ.
 * Krom rengini grafiğe taşımak doğrulayıcıdan kalır (eski marka lacivedi
 * #1B4E6B tam bu sebeple elendi: lightness 0.404 bant dışı, chroma 0.072
 * taban altı — grafikte gri okunuyordu). Mavi veri kimliği için #2563EB.
 *
 * Aşağıdaki 5'li kategorik tema doğrulandı (light, surface #fff):
 *   [PASS] Lightness band · [PASS] Chroma floor
 *   [PASS] CVD separation (en kötü komşu ΔE 16.2 protan / 22.0 tritan)
 *   [PASS] Contrast vs surface (5/5 ≥ 3:1)
 *
 * Palet değişirse doğrulayıcı TEKRAR çalıştırılmalı — göz kararı verilmez:
 *   node scripts/validate_palette.js "#2563EB,#16A34A,#D97706,#BE185D,#7C3AED" --mode light
 */

/** Doğrulanmış kategorik tema — sabit sıra, asla döngüye sokulmaz */
export const CATEGORICAL = ['#2563EB', '#16A34A', '#D97706', '#BE185D', '#7C3AED'] as const

/** Birim → renk. Renk varlığı takip eder, sırasını değil. */
export const UNIT_COLOR: Record<string, string> = {
  'Üniversite': '#2563EB',
  'Lise': '#16A34A',
  'Ortaokul': '#D97706',
  'Çocuk': '#BE185D',
  'Yönetim': '#7C3AED',
}

export const unitColor = (name: string) => UNIT_COLOR[name] ?? '#64748B'

/** Faaliyet türü → renk (kategorik kimlik, sabit sıra) */
export const ACTIVITY_COLOR: Record<string, string> = {
  'Toplantı': '#2563EB',
  'Haftalık Ders': '#16A34A',
  'Sosyal Faaliyet': '#D97706',
  'Diğer Eğitim': '#BE185D',
  'Tanıtım/Medya': '#0891B2',
  'Saha Ziyareti': '#64748B',
}

export const activityColor = (name: string) => ACTIVITY_COLOR[name] ?? '#64748B'

/** Grafik kromu — gridline ve eksenler resesif, DÜZ hairline (kesikli değil) */
export const CHART_CHROME = {
  grid: '#EEF2F6',
  axis: '#CBD5E1',
  tick: { fontSize: 11, fill: '#64748B' },
  tooltip: {
    fontSize: '12px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
    padding: '8px 10px',
  } as const,
  /** Marklar ince; veri ucu 4px yuvarlatılır */
  barRadius: [0, 4, 4, 0] as [number, number, number, number],
  barRadiusVertical: [4, 4, 0, 0] as [number, number, number, number],
}

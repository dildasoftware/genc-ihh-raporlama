/**
 * GENÇ İHH — Haftalık Rapor Soru Katalogu
 *
 * Sistemin TEK doğruluk kaynağı. Hem veri giriş formu hem de raporlama/karne
 * tarafı bu katalogdan beslenir.
 *
 * Tasarım ilkesi (Süreç Revizyonu dokümanı):
 *   Gönüllü "3 lokasyon, 47 kişi" yazmaz.
 *   Gönüllü kurumları tek tek ekler:
 *     [Hacı Bayram Veli Üni. → 12 kişi]
 *     [Yıldırım Beyazıt Üni. → 35 kişi]
 *   Lokasyon sayısı ve toplam katılım bu satırlardan TÜRETİLİR.
 *   Böylece "hangi üniversitede kaç kişi" detayı asla kaybolmaz.
 */

// ==================== BİRİMLER ====================

export type UnitKey = 'yonetim' | 'universite' | 'lise' | 'ortaokul' | 'cocuk'

export interface UnitDef {
  key: UnitKey
  /** prisma Unit.name ile birebir eşleşir */
  unitName: string
  label: string
  /** Soru metinlerinde geçen küçük harfli isim: "üniversite komisyon toplantısı" */
  noun: string
  /** Kurum satırlarında eklenecek şeyin adı: "Üniversite ekle" */
  entityLabel: string
  searchPlaceholder: string
  color: string
  bg: string
  border: string
  /** Lise → okul türü (İHL / Fen / Anadolu…) sorulur */
  hasSchoolType: boolean
  /** Üniversite → fakülte kırılımı sorulur */
  hasFaculty: boolean
  /**
   * Kurum adı serbest metin olarak girilebilir mi?
   * Üniversitede FALSE: resmî YÖK listesi seed'lendiği için yalnızca listeden
   * seçilir (bkz. lib/universities.ts). Böylece "Hacıbayram", "HBV Üni" gibi
   * tutarsız yazımlar veriye giremez ve kurum bazlı raporlar bölünmez.
   * Lise/ortaokul/çocukta TRUE: resmî MEB listesi henüz bağlanmadı.
   */
  allowFreeText: boolean
  /**
   * Yönetim biriminin kurumu yoktur — il yönetiminin kendi toplantısıdır.
   * Tek satır, sadece katılımcı sayısı.
   */
  isManagement: boolean
}

export const UNITS: UnitDef[] = [
  {
    key: 'yonetim',
    unitName: 'Yönetim',
    label: 'İl Yönetimi',
    noun: 'il yönetim',
    entityLabel: 'Yönetim toplantısı',
    searchPlaceholder: '',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#7C3AED',
    hasSchoolType: false,
    hasFaculty: false,
    allowFreeText: false,
    isManagement: true,
  },
  {
    key: 'universite',
    unitName: 'Üniversite',
    label: 'Üniversite',
    noun: 'üniversite',
    entityLabel: 'Üniversite',
    searchPlaceholder: 'Üniversite ara… (örn. Hacı Bayram)',
    color: '#1B4E6B',
    bg: '#EFF6FF',
    border: '#1B4E6B',
    hasSchoolType: false,
    hasFaculty: true,
    // Resmî YÖK listesi seed'li — serbest yazım kapalı
    allowFreeText: false,
    isManagement: false,
  },
  {
    key: 'lise',
    unitName: 'Lise',
    label: 'Lise',
    noun: 'lise',
    entityLabel: 'Lise',
    searchPlaceholder: 'Lise adı yazın… (örn. Keçiören İHL)',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#16A34A',
    hasSchoolType: true,
    hasFaculty: false,
    allowFreeText: true,
    isManagement: false,
  },
  {
    key: 'ortaokul',
    unitName: 'Ortaokul',
    label: 'Ortaokul',
    noun: 'ortaokul',
    entityLabel: 'Ortaokul',
    searchPlaceholder: 'Ortaokul adı yazın…',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#D97706',
    hasSchoolType: false,
    hasFaculty: false,
    allowFreeText: true,
    isManagement: false,
  },
  {
    key: 'cocuk',
    unitName: 'Çocuk',
    label: 'Çocuk',
    noun: 'çocuk',
    entityLabel: 'Çocuk birimi',
    searchPlaceholder: 'Birim / lokasyon adı yazın…',
    color: '#BE185D',
    bg: '#FDF2F8',
    border: '#BE185D',
    hasSchoolType: false,
    hasFaculty: false,
    allowFreeText: true,
    isManagement: false,
  },
]

export const UNIT_BY_KEY: Record<UnitKey, UnitDef> = Object.fromEntries(
  UNITS.map(u => [u.key, u])
) as Record<UnitKey, UnitDef>

export const SCHOOL_TYPES = ['İHL', 'Fen Lisesi', 'Anadolu Lisesi', 'Meslek Lisesi', 'Diğer'] as const

// ==================== FAALİYET TÜRLERİ ====================

/** prisma ActivityType.name ile birebir eşleşir */
export interface ActivityTypeDef {
  name: string
  /** Soru metninde geçen hali: "komisyon toplantısı" */
  phrase: string
  icon: string
  /** Excel raporundaki üst başlık — TOPLANTILAR / HAFTALIK DERSLER */
  group: string
}

export const ACTIVITY_TYPES: Record<string, ActivityTypeDef> = {
  'Toplantı':      { name: 'Toplantı',      phrase: 'komisyon toplantısı', icon: '🤝', group: 'Toplantılar' },
  'Haftalık Ders': { name: 'Haftalık Ders', phrase: 'haftalık ders',       icon: '📖', group: 'Haftalık Dersler' },
  'Sosyal Faaliyet': { name: 'Sosyal Faaliyet', phrase: 'sosyal faaliyet', icon: '🎭', group: 'Sosyal & Kültürel' },
  'Diğer Eğitim':  { name: 'Diğer Eğitim',  phrase: 'eğitim çalışması',    icon: '🎓', group: 'Eğitim' },
  'Proje/Fon':     { name: 'Proje/Fon',     phrase: 'proje/fon çalışması', icon: '💡', group: 'Proje & Fon' },
  'Tanıtım/Medya': { name: 'Tanıtım/Medya', phrase: 'tanıtım/medya çalışması', icon: '📣', group: 'Tanıtım' },
  'Saha Ziyareti': { name: 'Saha Ziyareti', phrase: 'saha ziyareti',       icon: '🚩', group: 'Saha' },
}

/** Hangi birimde hangi faaliyetler sorulur */
const UNIT_ACTIVITIES: Record<UnitKey, string[]> = {
  yonetim:    ['Toplantı'],
  universite: ['Toplantı', 'Haftalık Ders', 'Sosyal Faaliyet', 'Diğer Eğitim', 'Proje/Fon', 'Tanıtım/Medya', 'Saha Ziyareti'],
  lise:       ['Toplantı', 'Haftalık Ders', 'Sosyal Faaliyet', 'Diğer Eğitim', 'Proje/Fon', 'Tanıtım/Medya', 'Saha Ziyareti'],
  ortaokul:   ['Toplantı', 'Haftalık Ders', 'Sosyal Faaliyet', 'Diğer Eğitim', 'Tanıtım/Medya', 'Saha Ziyareti'],
  cocuk:      ['Toplantı', 'Haftalık Ders', 'Sosyal Faaliyet', 'Diğer Eğitim', 'Saha Ziyareti'],
}

// ==================== SORULAR ====================

export interface QuestionDef {
  /** Kararlı kimlik: "universite__Haftalık Ders" */
  id: string
  unitKey: UnitKey
  unitName: string
  activityType: string
  /** Ana soru: "Bu hafta üniversite komisyon toplantısı yapıldı mı?" */
  label: string
  /** Yardım metni — nasıl doldurulacağını anlatır */
  help: string
  /** Kurum satırı eklemek yerine tek katılımcı sayısı (yönetim) */
  isManagement: boolean
}

function buildQuestion(unit: UnitDef, activityType: string): QuestionDef {
  const at = ACTIVITY_TYPES[activityType]

  if (unit.isManagement) {
    return {
      id: `${unit.key}__${activityType}`,
      unitKey: unit.key,
      unitName: unit.unitName,
      activityType,
      label: `Bu hafta ${unit.noun} ${at.phrase} yapıldı mı?`,
      help: 'Yapıldıysa katılımcı sayısını girin. Yapılmadıysa boş bırakın.',
      isManagement: true,
    }
  }

  return {
    id: `${unit.key}__${activityType}`,
    unitKey: unit.key,
    unitName: unit.unitName,
    activityType,
    label: `Bu hafta ${unit.noun} ${at.phrase} hangi ${unit.entityLabel.toLowerCase()}lerde yapıldı?`,
    help: `Her ${unit.entityLabel.toLowerCase()} için ayrı satır ekleyin ve katılımcı sayısını yazın. Lokasyon sayısı ve toplam katılım otomatik hesaplanır. Yapılmadıysa hiç satır eklemeyin.`,
    isManagement: false,
  }
}

/** Tüm soru katalogu — form ve rapor bu listeden üretilir */
export const QUESTIONS: QuestionDef[] = UNITS.flatMap(unit =>
  UNIT_ACTIVITIES[unit.key].map(at => buildQuestion(unit, at))
)

export const QUESTIONS_BY_UNIT: Record<UnitKey, QuestionDef[]> = Object.fromEntries(
  UNITS.map(u => [u.key, QUESTIONS.filter(q => q.unitKey === u.key)])
) as Record<UnitKey, QuestionDef[]>

export function getQuestion(id: string): QuestionDef | undefined {
  return QUESTIONS.find(q => q.id === id)
}

// ==================== CEVAP TİPLERİ & TÜRETME ====================

/** Tek bir kurum satırı: "Hacı Bayram Veli Üni. → 12 kişi" */
export interface AnswerRow {
  /** İstemci tarafı geçici kimlik */
  id: string
  institutionName: string
  participantCount: number
  /** Lise için okul türü */
  schoolType?: string
  /** Üniversite için fakülte */
  facultyName?: string
  note?: string
}

export type Answers = Record<string, AnswerRow[]>

export interface DerivedStats {
  /** Kaç lokasyonda yapıldı — satır sayısından türetilir */
  locationCount: number
  /** Toplam kaç kişi katıldı — satırların toplamı */
  participantCount: number
  /** Yapıldı mı — Excel'deki YAPILDI sütunu (1/0) */
  done: boolean
}

/**
 * Bir sorunun cevabından Excel raporundaki YAPILDI / KATILIM
 * sütunlarını türetir. Bu sayılar ASLA elle girilmez.
 */
export function derive(rows: AnswerRow[] | undefined): DerivedStats {
  const valid = (rows ?? []).filter(r => r.institutionName.trim() !== '' || r.participantCount > 0)
  return {
    locationCount: valid.length,
    participantCount: valid.reduce((sum, r) => sum + (r.participantCount || 0), 0),
    done: valid.length > 0,
  }
}

/** Bir birimin tüm sorularının toplamı */
export function deriveUnitTotals(unitKey: UnitKey, answers: Answers) {
  const questions = QUESTIONS_BY_UNIT[unitKey]
  let locations = 0
  let participants = 0
  let doneCount = 0

  for (const q of questions) {
    const d = derive(answers[q.id])
    locations += d.locationCount
    participants += d.participantCount
    if (d.done) doneCount++
  }

  return {
    locations,
    participants,
    doneCount,
    totalQuestions: questions.length,
    /** Kaç farklı kurumda çalışma yapıldı (tekilleştirilmiş) */
    institutionCount: new Set(
      questions.flatMap(q =>
        (answers[q.id] ?? [])
          .map(r => r.institutionName.trim())
          .filter(Boolean)
      )
    ).size,
  }
}

/** Formun genel toplamı */
export function deriveGrandTotals(answers: Answers) {
  const perUnit = UNITS.map(u => ({ unit: u, ...deriveUnitTotals(u.key, answers) }))
  return {
    perUnit,
    locations: perUnit.reduce((s, u) => s + u.locations, 0),
    participants: perUnit.reduce((s, u) => s + u.participants, 0),
    doneCount: perUnit.reduce((s, u) => s + u.doneCount, 0),
    totalQuestions: QUESTIONS.length,
  }
}

/** Formun doldurulma yüzdesi — ilerleme çubuğu için */
export function completionPercent(answers: Answers): number {
  const answered = QUESTIONS.filter(q => derive(answers[q.id]).done).length
  return Math.round((answered / QUESTIONS.length) * 100)
}

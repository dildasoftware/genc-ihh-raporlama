'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  PlusCircle, Trash2, Loader2, GraduationCap, School, Building2,
  Baby, Users, Search, ChevronRight, CheckCircle2, XCircle,
  Save, BookOpen, MapPin, Target, BarChart3, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber } from '@/lib/utils'
import type { SessionUser } from '@/lib/authz'

// ==================== TİPLER ====================

interface InstitutionEntry {
  id: string
  name: string
  schoolType?: string // Lise için: İHL, Fen, Anadolu, Meslek, Diğer
  activities: ActivityEntry[]
}

interface ActivityEntry {
  type: string // Toplantı, Haftalık Ders, Sosyal Faaliyet, vb.
  locationCount: number
  participantCount: number
}

interface OrgStatus {
  ilBaskani: boolean
  teskilatBsk: boolean
  egitimBsk: boolean
  universiteBsk: boolean
  liseBsk: boolean
  ortaokulBsk: boolean
  ihhCocukBsk: boolean
  tanitimMedya: boolean
  projeFonBsk: boolean
  sosyalFaal: boolean
  atomBsk: boolean
  aktifGenclik: boolean
}

interface Targets {
  teskilatHedefi: number
  ilceHedefi: number
  fakulteBaskanHedefi: number
  liseTemsilciHedefi: number
  fonHedefi: number
}

interface FormState {
  // Genel
  population: number
  districtCount: number
  studentCount: number
  // Kurum sayıları
  universityCount: number
  highSchoolCount: number
  middleSchoolCount: number
  kykCount: number
  dormCount: number
  // Detaylı veriler
  universities: InstitutionEntry[]
  highSchools: InstitutionEntry[]
  middleSchools: InstitutionEntry[]
  childUnits: InstitutionEntry[]
  // Teşkilat
  orgStatus: OrgStatus
  // İlçe
  totalDistrictCount: number
  ihhDistrictCount: number
  gencIhhDistrictCount: number
  // Hedefler
  targets: Targets
}

const ACTIVITY_TYPES = ['Toplantı', 'Haftalık Ders', 'Sosyal Faaliyet', 'Proje/Fon', 'Diğer Eğitim', 'Tanıtım/Medya', 'Saha Ziyareti']
const SCHOOL_TYPES = ['İHL', 'Fen Lisesi', 'Anadolu Lisesi', 'Meslek Lisesi', 'Diğer']

const ORG_POSITIONS: { key: keyof OrgStatus; label: string }[] = [
  { key: 'ilBaskani', label: 'İl Başkanı' },
  { key: 'teskilatBsk', label: 'Teşkilat Bşk.' },
  { key: 'egitimBsk', label: 'Eğitim Bşk.' },
  { key: 'universiteBsk', label: 'Üniversite Bşk.' },
  { key: 'liseBsk', label: 'Lise Bşk.' },
  { key: 'ortaokulBsk', label: 'Ortaokul Bşk.' },
  { key: 'ihhCocukBsk', label: 'İHH Çocuk Bşk.' },
  { key: 'tanitimMedya', label: 'Tanıtım Medya' },
  { key: 'projeFonBsk', label: 'Proje Fon Bşk.' },
  { key: 'sosyalFaal', label: 'Sosyal Faal.' },
  { key: 'atomBsk', label: 'ATOM Bşk.' },
  { key: 'aktifGenclik', label: 'Aktif Gençlik' },
]

const UNIT_COLORS = {
  university: { bg: '#EFF6FF', border: '#1B4E6B', text: '#1B4E6B', icon: '#1B4E6B' },
  highSchool: { bg: '#F0FDF4', border: '#16A34A', text: '#15803D', icon: '#16A34A' },
  middleSchool: { bg: '#FFFBEB', border: '#D97706', text: '#B45309', icon: '#D97706' },
  child: { bg: '#FDF2F8', border: '#BE185D', text: '#9D174D', icon: '#BE185D' },
}

const DEFAULT_ORG: OrgStatus = {
  ilBaskani: false, teskilatBsk: false, egitimBsk: false, universiteBsk: false,
  liseBsk: false, ortaokulBsk: false, ihhCocukBsk: false, tanitimMedya: false,
  projeFonBsk: false, sosyalFaal: false, atomBsk: false, aktifGenclik: false,
}

const DEFAULT_TARGETS: Targets = {
  teskilatHedefi: 0, ilceHedefi: 0, fakulteBaskanHedefi: 0,
  liseTemsilciHedefi: 0, fonHedefi: 0,
}

// ==================== AUTOCOMPLETE BİLEŞENİ ====================

function InstitutionSearch({
  unitType,
  placeholder,
  onSelect,
  provinceId,
}: {
  unitType: string
  placeholder: string
  onSelect: (name: string) => void
  provinceId?: number | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return }
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ q, unitType })
      if (provinceId) params.set('provinceId', provinceId.toString())
      const res = await fetch(`/api/institutions/search?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.map((d: any) => d.name))
        setIsOpen(true)
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [unitType, provinceId])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-10"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.length > 0 ? results.map(name => (
            <button
              key={name}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
              onClick={() => { onSelect(name); setQuery(''); setIsOpen(false) }}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {name}
            </button>
          )) : (
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-2">Sonuç bulunamadı</p>
              <button
                className="w-full text-left px-3 py-2 text-sm bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2 text-primary font-medium"
                onClick={() => { onSelect(query); setQuery(''); setIsOpen(false) }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                &quot;{query}&quot; olarak ekle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== KURUM KARTI BİLEŞENİ ====================

function InstitutionCard({
  entry,
  color,
  showSchoolType,
  onUpdate,
  onRemove,
}: {
  entry: InstitutionEntry
  color: typeof UNIT_COLORS.university
  showSchoolType?: boolean
  onUpdate: (updated: InstitutionEntry) => void
  onRemove: () => void
}) {
  const updateActivity = (idx: number, field: keyof ActivityEntry, value: number) => {
    const newActivities = [...entry.activities]
    newActivities[idx] = { ...newActivities[idx], [field]: value }
    onUpdate({ ...entry, activities: newActivities })
  }

  const addActivity = (type: string) => {
    if (entry.activities.some(a => a.type === type)) return
    onUpdate({
      ...entry,
      activities: [...entry.activities, { type, locationCount: 0, participantCount: 0 }],
    })
  }

  const removeActivity = (idx: number) => {
    onUpdate({ ...entry, activities: entry.activities.filter((_, i) => i !== idx) })
  }

  const totalParticipants = entry.activities.reduce((s, a) => s + a.participantCount, 0)

  return (
    <div
      className="rounded-xl border-2 p-4 transition-all hover:shadow-md animate-fade-in-up"
      style={{ borderColor: color.border + '40', background: color.bg }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color.border }}>
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: color.text }}>{entry.name}</p>
            {showSchoolType && entry.schoolType && (
              <Badge variant="secondary" className="text-xs mt-0.5">{entry.schoolType}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs" style={{ background: color.border, color: '#fff' }}>
            {totalParticipants} kişi
          </Badge>
          <button onClick={onRemove} className="p-1 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {/* Faaliyet satırları */}
      {entry.activities.length > 0 && (
        <div className="space-y-2 mb-3">
          {entry.activities.map((act, idx) => (
            <div key={act.type} className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-slate-600 min-w-[100px]">{act.type}</span>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <Input
                  type="number"
                  min={0}
                  value={act.locationCount || ''}
                  onChange={e => updateActivity(idx, 'locationCount', parseInt(e.target.value) || 0)}
                  placeholder="Lokasyon"
                  className="h-7 w-20 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-400" />
                <Input
                  type="number"
                  min={0}
                  value={act.participantCount || ''}
                  onChange={e => updateActivity(idx, 'participantCount', parseInt(e.target.value) || 0)}
                  placeholder="Kişi"
                  className="h-7 w-20 text-xs"
                />
              </div>
              <button onClick={() => removeActivity(idx)} className="p-0.5 rounded hover:bg-red-50">
                <XCircle className="h-3.5 w-3.5 text-red-300 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Faaliyet Ekle */}
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES.filter(t => !entry.activities.some(a => a.type === t)).map(type => (
          <button
            key={type}
            onClick={() => addActivity(type)}
            className="px-2 py-1 rounded-md text-xs border border-dashed transition-all hover:border-solid hover:shadow-sm"
            style={{ borderColor: color.border + '60', color: color.text }}
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== ÖZET KARTI ====================

function SummaryCard({ entries, label, color, icon: Icon }: {
  entries: InstitutionEntry[]
  label: string
  color: typeof UNIT_COLORS.university
  icon: React.ElementType
}) {
  const totalInst = entries.length
  const totalAct = entries.reduce((s, e) => s + e.activities.length, 0)
  const totalPart = entries.reduce((s, e) => s + e.activities.reduce((ss, a) => ss + a.participantCount, 0), 0)
  const totalLoc = entries.reduce((s, e) => s + e.activities.reduce((ss, a) => ss + a.locationCount, 0), 0)

  if (totalInst === 0) return null

  return (
    <div className="rounded-xl p-3 border" style={{ borderColor: color.border + '30', background: color.bg }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: color.icon }} />
        <span className="text-xs font-semibold" style={{ color: color.text }}>{label} Özeti</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold" style={{ color: color.text }}>{totalInst}</p>
          <p className="text-xs text-slate-500">Kurum</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: color.text }}>{totalAct}</p>
          <p className="text-xs text-slate-500">Faaliyet</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: color.text }}>{totalLoc}</p>
          <p className="text-xs text-slate-500">Lokasyon</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: color.text }}>{formatNumber(totalPart)}</p>
          <p className="text-xs text-slate-500">Katılımcı</p>
        </div>
      </div>
    </div>
  )
}

// ==================== ANA FORM BİLEŞENİ ====================

interface SoruFormuProps {
  user: SessionUser
  provinces: { id: number; name: string }[]
  year: number
}

export default function SoruFormu({ user, provinces, year }: SoruFormuProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProvinceId, setSelectedProvinceId] = useState<number>(user.provinceId || 0)
  const [selectedYear, setSelectedYear] = useState(year)
  const [activeTab, setActiveTab] = useState('genel')

  const [form, setForm] = useState<FormState>({
    population: 0, districtCount: 0, studentCount: 0,
    universityCount: 0, highSchoolCount: 0, middleSchoolCount: 0, kykCount: 0, dormCount: 0,
    universities: [], highSchools: [], middleSchools: [], childUnits: [],
    orgStatus: { ...DEFAULT_ORG },
    totalDistrictCount: 0, ihhDistrictCount: 0, gencIhhDistrictCount: 0,
    targets: { ...DEFAULT_TARGETS },
  })

  // Mevcut veriyi yükle
  useEffect(() => {
    if (!selectedProvinceId) return
    setIsLoading(true)
    fetch(`/api/province-report?provinceId=${selectedProvinceId}&year=${selectedYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setForm({
            population: data.population || 0,
            districtCount: data.districtCount || 0,
            studentCount: data.studentCount || 0,
            universityCount: data.universityCount || 0,
            highSchoolCount: data.highSchoolCount || 0,
            middleSchoolCount: data.middleSchoolCount || 0,
            kykCount: data.kykCount || 0,
            dormCount: data.dormCount || 0,
            universities: data.universityData || [],
            highSchools: data.highSchoolData || [],
            middleSchools: data.middleSchoolData || [],
            childUnits: data.childData || [],
            orgStatus: data.orgStatus || { ...DEFAULT_ORG },
            totalDistrictCount: data.totalDistrictCount || 0,
            ihhDistrictCount: data.ihhDistrictCount || 0,
            gencIhhDistrictCount: data.gencIhhDistrictCount || 0,
            targets: data.targets || { ...DEFAULT_TARGETS },
          })
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [selectedProvinceId, selectedYear])

  // Kurum ekleme
  const addInstitution = (
    field: 'universities' | 'highSchools' | 'middleSchools' | 'childUnits',
    name: string,
    schoolType?: string
  ) => {
    if (form[field].some(e => e.name === name)) {
      toast.error('Bu kurum zaten ekli')
      return
    }
    setForm(prev => ({
      ...prev,
      [field]: [
        ...prev[field],
        { id: crypto.randomUUID(), name, schoolType, activities: [] },
      ],
    }))
  }

  // Kurum güncelleme
  const updateInstitution = (
    field: 'universities' | 'highSchools' | 'middleSchools' | 'childUnits',
    id: string,
    updated: InstitutionEntry
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].map(e => e.id === id ? updated : e),
    }))
  }

  // Kurum silme
  const removeInstitution = (
    field: 'universities' | 'highSchools' | 'middleSchools' | 'childUnits',
    id: string
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter(e => e.id !== id),
    }))
  }

  // Kaydet
  async function handleSave() {
    if (!selectedProvinceId) {
      toast.error('Lütfen il seçiniz')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/province-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provinceId: selectedProvinceId,
          year: selectedYear,
          population: form.population,
          districtCount: form.districtCount,
          studentCount: form.studentCount,
          universityCount: form.universityCount || form.universities.length,
          highSchoolCount: form.highSchoolCount || form.highSchools.length,
          middleSchoolCount: form.middleSchoolCount || form.middleSchools.length,
          kykCount: form.kykCount,
          dormCount: form.dormCount,
          universityData: form.universities,
          highSchoolData: form.highSchools,
          middleSchoolData: form.middleSchools,
          childData: form.childUnits,
          orgStatus: form.orgStatus,
          totalDistrictCount: form.totalDistrictCount,
          ihhDistrictCount: form.ihhDistrictCount,
          gencIhhDistrictCount: form.gencIhhDistrictCount,
          targets: form.targets,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Kayıt başarısız')
      toast.success('İl rapor verisi kaydedildi!', { description: 'Tüm detaylar başarıyla güncellendi.' })
    } catch (err: any) {
      toast.error('Kayıt hatası', { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const provinceName = provinces.find(p => p.id === selectedProvinceId)?.name || 'İl seçiniz'
  const totalAllParticipants = [
    ...form.universities, ...form.highSchools, ...form.middleSchools, ...form.childUnits
  ].reduce((s, e) => s + e.activities.reduce((ss, a) => ss + a.participantCount, 0), 0)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
        <p className="text-sm text-slate-500">Mevcut veriler yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 min-w-0 w-full">
      {/* Başlık + İl/Yıl Seçimi */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <BarChart3 className="h-5 w-5" style={{ color: '#1B4E6B' }} />
            <span className="gradient-text">İl Rapor Verisi</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detaylı kurum bazlı veri girişi — genelden özele
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">İl</label>
            <select
              value={selectedProvinceId}
              onChange={e => setSelectedProvinceId(parseInt(e.target.value))}
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none"
              disabled={user.role === 'IL_KOORDINATOR'}
            >
              <option value={0}>İl seçiniz</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Yıl</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Global Özet Bar */}
      {totalAllParticipants > 0 && (
        <div className="premium-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard entries={form.universities} label="Üniversite" color={UNIT_COLORS.university} icon={GraduationCap} />
            <SummaryCard entries={form.highSchools} label="Lise" color={UNIT_COLORS.highSchool} icon={School} />
            <SummaryCard entries={form.middleSchools} label="Ortaokul" color={UNIT_COLORS.middleSchool} icon={BookOpen} />
            <SummaryCard entries={form.childUnits} label="Çocuk" color={UNIT_COLORS.child} icon={Baby} />
          </div>
        </div>
      )}

      {/* Ana Sekme İçeriği */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <TabsList className="w-full flex flex-wrap gap-1 h-auto rounded-xl bg-slate-100/80 p-1.5">
          <TabsTrigger value="genel" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <MapPin className="h-3.5 w-3.5 mr-1" /> Genel
          </TabsTrigger>
          <TabsTrigger value="universite" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <GraduationCap className="h-3.5 w-3.5 mr-1" /> Üniversite
          </TabsTrigger>
          <TabsTrigger value="lise" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <School className="h-3.5 w-3.5 mr-1" /> Lise
          </TabsTrigger>
          <TabsTrigger value="ortaokul" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Ortaokul
          </TabsTrigger>
          <TabsTrigger value="cocuk" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Baby className="h-3.5 w-3.5 mr-1" /> Çocuk
          </TabsTrigger>
          <TabsTrigger value="teskilat" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="h-3.5 w-3.5 mr-1" /> Teşkilat
          </TabsTrigger>
        </TabsList>

        {/* ── GENEL BİLGİLER ── */}
        <TabsContent value="genel" className="mt-4">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: '#1B4E6B' }} />
                İl Genel Verileri — {provinceName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Nüfus', key: 'population' as const, icon: '👥' },
                  { label: 'İlçe Sayısı', key: 'districtCount' as const, icon: '📍' },
                  { label: 'Öğrenci Sayısı', key: 'studentCount' as const, icon: '🎓' },
                  { label: 'Üniversite Sayısı', key: 'universityCount' as const, icon: '🏛️' },
                  { label: 'Lise Sayısı', key: 'highSchoolCount' as const, icon: '🏫' },
                  { label: 'Ortaokul Sayısı', key: 'middleSchoolCount' as const, icon: '📚' },
                  { label: 'İlkokul Sayısı KYK', key: 'kykCount' as const, icon: '🏘️' },
                  { label: 'Yurdu Sayısı', key: 'dormCount' as const, icon: '🏠' },
                ].map(item => (
                  <div key={item.key} className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <span>{item.icon}</span> {item.label}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={form[item.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ÜNİVERSİTE ── */}
        <TabsContent value="universite" className="mt-4 space-y-4">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" style={{ color: UNIT_COLORS.university.icon }} />
                Üniversiteler
                {form.universities.length > 0 && (
                  <Badge style={{ background: UNIT_COLORS.university.border }}>{form.universities.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mevcut üniversiteler */}
              {form.universities.map(entry => (
                <InstitutionCard
                  key={entry.id}
                  entry={entry}
                  color={UNIT_COLORS.university}
                  onUpdate={updated => updateInstitution('universities', entry.id, updated)}
                  onRemove={() => removeInstitution('universities', entry.id)}
                />
              ))}

              {/* Yeni üniversite ekle */}
              <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: UNIT_COLORS.university.border + '40' }}>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <PlusCircle className="h-3.5 w-3.5" /> Üniversite Ekle
                </p>
                <InstitutionSearch
                  unitType="Üniversite"
                  placeholder="Üniversite adı yazın..."
                  provinceId={selectedProvinceId}
                  onSelect={name => addInstitution('universities', name)}
                />
              </div>

              {/* KYK ve Yurt */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs">KYK Sayısı</Label>
                  <Input
                    type="number" min={0}
                    value={form.kykCount || ''}
                    onChange={e => setForm(prev => ({ ...prev, kykCount: parseInt(e.target.value) || 0 }))}
                    className="h-9" placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Yurt Sayısı</Label>
                  <Input
                    type="number" min={0}
                    value={form.dormCount || ''}
                    onChange={e => setForm(prev => ({ ...prev, dormCount: parseInt(e.target.value) || 0 }))}
                    className="h-9" placeholder="0"
                  />
                </div>
              </div>

              <SummaryCard entries={form.universities} label="Üniversite" color={UNIT_COLORS.university} icon={GraduationCap} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LİSE ── */}
        <TabsContent value="lise" className="mt-4 space-y-4">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <School className="h-4 w-4" style={{ color: UNIT_COLORS.highSchool.icon }} />
                Liseler
                {form.highSchools.length > 0 && (
                  <Badge style={{ background: UNIT_COLORS.highSchool.border }}>{form.highSchools.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.highSchools.map(entry => (
                <InstitutionCard
                  key={entry.id}
                  entry={entry}
                  color={UNIT_COLORS.highSchool}
                  showSchoolType
                  onUpdate={updated => updateInstitution('highSchools', entry.id, updated)}
                  onRemove={() => removeInstitution('highSchools', entry.id)}
                />
              ))}

              <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: UNIT_COLORS.highSchool.border + '40' }}>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <PlusCircle className="h-3.5 w-3.5" /> Lise Ekle
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <InstitutionSearch
                      unitType="Lise"
                      placeholder="Lise adı yazın..."
                      provinceId={selectedProvinceId}
                      onSelect={name => {
                        // Okul türü seçimi için basit dropdown
                        const type = prompt('Okul türünü seçin:\n1) İHL\n2) Fen Lisesi\n3) Anadolu Lisesi\n4) Meslek Lisesi\n5) Diğer')
                        const schoolType = SCHOOL_TYPES[parseInt(type || '5') - 1] || 'Diğer'
                        addInstitution('highSchools', name, schoolType)
                      }}
                    />
                  </div>
                </div>
              </div>

              <SummaryCard entries={form.highSchools} label="Lise" color={UNIT_COLORS.highSchool} icon={School} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ORTAOKUL ── */}
        <TabsContent value="ortaokul" className="mt-4 space-y-4">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" style={{ color: UNIT_COLORS.middleSchool.icon }} />
                Ortaokullar
                {form.middleSchools.length > 0 && (
                  <Badge style={{ background: UNIT_COLORS.middleSchool.border }}>{form.middleSchools.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.middleSchools.map(entry => (
                <InstitutionCard
                  key={entry.id}
                  entry={entry}
                  color={UNIT_COLORS.middleSchool}
                  onUpdate={updated => updateInstitution('middleSchools', entry.id, updated)}
                  onRemove={() => removeInstitution('middleSchools', entry.id)}
                />
              ))}

              <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: UNIT_COLORS.middleSchool.border + '40' }}>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <PlusCircle className="h-3.5 w-3.5" /> Ortaokul Ekle
                </p>
                <InstitutionSearch
                  unitType="Ortaokul"
                  placeholder="Ortaokul adı yazın..."
                  provinceId={selectedProvinceId}
                  onSelect={name => addInstitution('middleSchools', name)}
                />
              </div>

              <SummaryCard entries={form.middleSchools} label="Ortaokul" color={UNIT_COLORS.middleSchool} icon={BookOpen} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ÇOCUK ── */}
        <TabsContent value="cocuk" className="mt-4 space-y-4">
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Baby className="h-4 w-4" style={{ color: UNIT_COLORS.child.icon }} />
                Çocuk Birimleri
                {form.childUnits.length > 0 && (
                  <Badge style={{ background: UNIT_COLORS.child.border }}>{form.childUnits.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.childUnits.map(entry => (
                <InstitutionCard
                  key={entry.id}
                  entry={entry}
                  color={UNIT_COLORS.child}
                  onUpdate={updated => updateInstitution('childUnits', entry.id, updated)}
                  onRemove={() => removeInstitution('childUnits', entry.id)}
                />
              ))}

              <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: UNIT_COLORS.child.border + '40' }}>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <PlusCircle className="h-3.5 w-3.5" /> Çocuk Birimi Ekle
                </p>
                <InstitutionSearch
                  unitType="Çocuk"
                  placeholder="Birim adı yazın..."
                  provinceId={selectedProvinceId}
                  onSelect={name => addInstitution('childUnits', name)}
                />
              </div>

              <SummaryCard entries={form.childUnits} label="Çocuk" color={UNIT_COLORS.child} icon={Baby} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEŞKİLAT ── */}
        <TabsContent value="teskilat" className="mt-4 space-y-4">
          {/* Teşkilat Durumu */}
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: '#1B4E6B' }} />
                Teşkilat Durumu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ORG_POSITIONS.map(pos => {
                  const active = form.orgStatus[pos.key]
                  return (
                    <button
                      key={pos.key}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        orgStatus: { ...prev.orgStatus, [pos.key]: !prev.orgStatus[pos.key] },
                      }))}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        active
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-red-200 bg-red-50/50 text-red-400'
                      }`}
                    >
                      {active
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-300 shrink-0" />}
                      {pos.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Aktif pozisyonlar: {Object.values(form.orgStatus).filter(Boolean).length} / {ORG_POSITIONS.length}
              </p>
            </CardContent>
          </Card>

          {/* İlçe Çalışmaları */}
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: '#D97706' }} />
                İlçe Çalışmaları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">İlde Kaç İlçe Var?</Label>
                  <Input type="number" min={0} value={form.totalDistrictCount || ''} className="h-9"
                    onChange={e => setForm(prev => ({ ...prev, totalDistrictCount: parseInt(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">İHH Kaç İlçede Var?</Label>
                  <Input type="number" min={0} value={form.ihhDistrictCount || ''} className="h-9"
                    onChange={e => setForm(prev => ({ ...prev, ihhDistrictCount: parseInt(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Genç İHH Hanımlar Kaç İlçede?</Label>
                  <Input type="number" min={0} value={form.gencIhhDistrictCount || ''} className="h-9"
                    onChange={e => setForm(prev => ({ ...prev, gencIhhDistrictCount: parseInt(e.target.value) || 0 }))} placeholder="0" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dönem Hedefleri */}
          <Card className="premium-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: '#BE185D' }} />
                Dönem Hedefleri — {selectedYear}-{selectedYear + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Teşkilat Hedefi', key: 'teskilatHedefi' as const },
                  { label: 'İlçe Hedefi', key: 'ilceHedefi' as const },
                  { label: 'Fakülte Başkanı Hedefi', key: 'fakulteBaskanHedefi' as const },
                  { label: 'Lise Temsilci Hedefi', key: 'liseTemsilciHedefi' as const },
                  { label: 'Fon Hedefi (TL)', key: 'fonHedefi' as const },
                ].map(item => (
                  <div key={item.key} className="space-y-1.5">
                    <Label className="text-xs">{item.label}</Label>
                    <Input
                      type="number" min={0}
                      value={form.targets[item.key] || ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        targets: { ...prev.targets, [item.key]: parseInt(e.target.value) || 0 },
                      }))}
                      className="h-9" placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Kaydet Butonu */}
      <div className="sticky bottom-4 z-40">
        <Button
          onClick={handleSave}
          disabled={isSaving || !selectedProvinceId}
          className="w-full h-12 text-base font-semibold rounded-xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1B4E6B, #16A34A)' }}
        >
          {isSaving ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Kaydediliyor...</>
          ) : (
            <><Save className="h-5 w-5 mr-2" /> Kaydet — {provinceName} {selectedYear}-{selectedYear + 1}</>
          )}
        </Button>
      </div>
    </div>
  )
}

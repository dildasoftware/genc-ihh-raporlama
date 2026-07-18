'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Printer, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus,
  Users, Building2, CalendarCheck, Target, Shield, CheckCircle2,
  XCircle, Award, MapPin, Table as TableIcon, BarChart3, Save, Check,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, LabelList, Legend,
} from 'recharts'
import { DIMENSIONS } from '@/lib/karne'
import { unitColor, activityColor, CHART_CHROME } from '@/lib/chart-colors'
import { buildKarneSummary, buildKarneTitle } from '@/lib/reports'
import { formatNumber } from '@/lib/utils'

const ORG_LABELS: { key: string; label: string }[] = [
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

const TARGET_LABELS: { key: string; label: string; suffix?: string }[] = [
  { key: 'teskilatHedefi', label: 'Teşkilat Hedefi' },
  { key: 'ilceHedefi', label: 'İlçe Hedefi' },
  { key: 'fakulteBaskanHedefi', label: 'Fakülte Başkanı Hedefi' },
  { key: 'liseTemsilciHedefi', label: 'Lise Temsilci Hedefi' },
  { key: 'fonHedefi', label: 'Fon Hedefi', suffix: ' TL' },
]

function Section({
  title,
  icon: Icon,
  color,
  children,
  subtitle,
  breakBefore,
}: {
  title: string
  icon: React.ElementType
  color: string
  children: React.ReactNode
  subtitle?: string
  breakBefore?: boolean
}) {
  return (
    <div className={`premium-card p-5 print-avoid-break ${breakBefore ? 'print-break-before' : ''}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-slate-400">
      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-25" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function DeltaBadge({ val1, val2 }: { val1: number, val2: number }) {
  if (!val2) return null
  const diff = val1 - val2
  if (diff > 0) return <span className="ml-2 text-sm text-green-600 font-bold bg-green-50 px-1.5 rounded">+{formatNumber(diff)} <ArrowUp className="inline h-3 w-3" /></span>
  if (diff < 0) return <span className="ml-2 text-sm text-red-600 font-bold bg-red-50 px-1.5 rounded">{formatNumber(diff)} <ArrowDown className="inline h-3 w-3" /></span>
  return <span className="ml-2 text-sm text-slate-400 font-bold bg-slate-50 px-1.5 rounded">Fark yok <Minus className="inline h-3 w-3" /></span>
}

interface Props {
  provinceId: number
  year: number
  units: { id: number; name: string }[]
  activityTypes: { id: number; name: string }[]
  periods: any[]
  canFilterGender: boolean
  hideScoreAndRank?: boolean
}

export default function KarneDetayClient({
  provinceId, year: initialYear, units, activityTypes, periods = [], canFilterGender, hideScoreAndRank,
}: Props) {
  const [gender, setGender] = useState('ALL')
  const [unitId, setUnitId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  
  const [type, setType] = useState<'WEEK' | 'MONTH' | 'YEAR'>('YEAR')
  const [p1, setP1] = useState<string>(initialYear.toString())
  const [p2, setP2] = useState<string>('')
  const [isCompare, setIsCompare] = useState(false)

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  // Derive options based on periods
  const { yearOptions, monthOptions, weekOptions } = useMemo(() => {
    const years = new Set<string>()
    const months = new Map<string, string>()
    const weeks = new Map<string, string>()

    periods.forEach((p: any) => {
      years.add(p.year.toString())
      months.set(`${p.year}-${p.month}`, `${p.year} / ${p.month}. Ay`)
      weeks.set(`${p.year}-${p.weekNo}`, `${p.year} / ${p.weekNo}. Hafta`)
    })

    return {
      yearOptions: Array.from(years).map((y: any) => ({ value: y, label: `${y} Yılı` })),
      monthOptions: Array.from(months.entries()).map(([k, v]) => ({ value: k, label: v })),
      weekOptions: Array.from(weeks.entries()).map(([k, v]) => ({ value: k, label: v }))
    }
  }, [periods])

  const options = type === 'YEAR' ? yearOptions : type === 'MONTH' ? monthOptions : weekOptions

  useEffect(() => {
    if (options.length > 0) {
      if (!options.find((o: any) => o.value === p1)) setP1(options[0].value)
      if (isCompare && !options.find((o: any) => o.value === p2)) setP2(options[1]?.value || options[0].value)
    }
  }, [type, options, isCompare, p1, p2])

  const load = useCallback(async () => {
    if (!p1) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (canFilterGender && gender !== 'ALL') params.set('gender', gender)
      if (unitId) params.set('unitId', unitId)
      if (activityTypeId) params.set('activityTypeId', activityTypeId)
      params.set('type', type)
      params.set('p1', p1)
      if (isCompare && p2) params.set('p2', p2)

      const url = provinceId === 0 ? `/api/karne/ulusal?${params}` : `/api/karne/${provinceId}?${params}`
      const res = await fetch(url)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Karne alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [provinceId, gender, unitId, activityTypeId, canFilterGender, type, p1, p2, isCompare])

  useEffect(() => { load() }, [load])

  useEffect(() => { setSavedId(null) }, [p1, p2, isCompare, gender, unitId, activityTypeId, type])

  const province = data?.province
  const d1 = data?.data1
  const d2 = data?.data2
  const karne = d1?.karne


  /**
   * Karneyi kalıcı arşive yazar. PDF dosyası değil, verinin anlık görüntüsü
   * saklanır — kayıt sonradan birebir yeniden açılıp tekrar PDF'e basılabilir.
   */
  async function handleSaveToArchive() {
    if (!karne || !province) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'KARNE',
          scopeType: provinceId === 0 ? 'COUNTRY' : 'PROVINCE',
          scopeId: provinceId === 0 ? 0 : province.id,
          scopeName: province.name,
          year: parseInt(p1),
          genderScope: canFilterGender ? gender : null,
          title: buildKarneTitle(province.name, parseInt(p1), canFilterGender && gender !== 'ALL' ? gender : null),
          summaryJson: buildKarneSummary(karne, d1.nationalCount),
          snapshotJson: {
            karne,
            province,
            institutions: d1.institutions,
            report: d1.report,
            regionRank: d1.regionRank,
            regionCount: d1.regionCount,
            nationalCount: d1.nationalCount,
            weekCount: d1.weekCount,
            filters: { year: parseInt(p1), gender, unitId, activityTypeId },
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Kayıt başarısız')
      setSavedId(json.id)
      toast.success('Karne arşive kaydedildi', {
        description: 'Arşiv sayfasından istediğiniz zaman açabilirsiniz.',
        action: { label: 'Aç', onClick: () => { window.location.href = `/arsiv/${json.id}` } },
      })
    } catch (e: any) {
      toast.error('Kayıt hatası', { description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Grafik verileri ──
  const radarData = useMemo(
    () => (karne ? DIMENSIONS.map((d: any) => ({
      boyut: d.label,
      puan: Math.round(karne.scores[d.key]),
    })) : []),
    [karne]
  )

  const dimensionBars = useMemo(
    () => (karne ? DIMENSIONS.map((d: any) => ({
      name: d.label,
      puan: Math.round(karne.scores[d.key]),
      color: d.color,
      weight: d.weight,
      description: d.description,
    })) : []),
    [karne]
  )

  const unitBars = useMemo(
    () => (karne ? Object.entries(karne.byUnit as Record<string, any>)
      .map(([name, v]) => ({
        name,
        katılımcı: v.participants,
        faaliyet: v.count,
        kurum: v.institutionCount,
      }))
      .sort((a, b) => b.katılımcı - a.katılımcı) : []),
    [karne]
  )

  const activityBars = useMemo(
    () => (karne ? Object.entries(karne.byActivityType as Record<string, any>)
      .map(([name, v]) => ({ name, katılımcı: v.participants, faaliyet: v.count }))
      .sort((a, b) => b.katılımcı - a.katılımcı) : []),
    [karne]
  )

  const weekLine = useMemo(() => {
    if (!karne) return []
    return Object.entries(karne.byWeek as Record<string, any>)
      .map(([week, v]) => ({ hafta: parseInt(week), katılımcı: v.participants }))
      .sort((a, b) => a.hafta - b.hafta)
  }, [karne])

  const compareByUnit = useMemo(() => {
    if (!d1?.karne || !d2?.karne) return []
    
    const u1List = Object.entries(d1.karne.byUnit as Record<string, any>).map(([name, v]) => ({ name, ...v }))
    const u2List = Object.entries(d2.karne.byUnit as Record<string, any>).map(([name, v]) => ({ name, ...v }))

    const allUnits = new Set([...u1List.map((u: any) => u.name), ...u2List.map((u: any) => u.name)])
    return Array.from(allUnits).map(name => {
      const u1 = u1List.find((u: any) => u.name === name) || { participants: 0, count: 0 }
      const u2 = u2List.find((u: any) => u.name === name) || { participants: 0, count: 0 }
      return { name, [p1]: u1.participants, [p2]: u2.participants }
    })
  }, [d1, d2, p1, p2])

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
        <p className="text-sm text-slate-500">Karne hesaplanıyor…</p>
      </div>
    )
  }

  if (!karne) {
    return (
      <div className="p-5 max-w-6xl mx-auto">
        {!hideScoreAndRank && (
          <Link href="/karne" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4" /> Tüm iller
          </Link>
        )}
        <div className="premium-card p-12 text-center">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">{province?.name} için bu filtrelerde veri yok</p>
          <p className="text-sm text-slate-400 mt-1">
            Haftalık rapor girildiğinde karne otomatik oluşur.
          </p>
        </div>
      </div>
    )
  }

  const report = d1?.report
  const orgStatus = (report?.orgStatus ?? {}) as Record<string, boolean>
  const orgNames = (report?.orgNames ?? {}) as Record<string, string | null>
  const targets = (report?.targets ?? {}) as Record<string, number>
  const grade = karne.grade

  return (
    <div className={`p-5 max-w-6xl mx-auto space-y-4 print-full ${isLoading ? 'opacity-60' : ''} transition-opacity`}>

      {/* ── Üst bar (yazdırılmaz) ── */}
      <div className="flex items-center justify-between no-print">
        {!hideScoreAndRank ? (
          <Link href="/karne" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Tüm iller
          </Link>
        ) : <div />}
        <div className="flex items-center gap-2">
          {savedId ? (
            <Link href={`/arsiv/${savedId}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{ borderColor: '#16A34A', color: '#16A34A', background: '#F0FDF4' }}>
              <Check className="h-4 w-4" /> Arşive kaydedildi — aç
            </Link>
          ) : (
            <button
              onClick={handleSaveToArchive}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border
                         bg-white hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              style={{ borderColor: '#CBD5E1', color: '#334155' }}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Arşive kaydet
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
            style={{ background: '#1B4E6B' }}
          >
            <Printer className="h-4 w-4" /> PDF olarak indir
          </button>
        </div>
      </div>

      {/* ── Filtreler: genelden özele, tek satır, hepsini kapsar ── */}
      <div className="filter-bar flex flex-wrap gap-3 items-end no-print bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Periyot Tipi</label>
          <select value={type} onChange={e => setType(e.target.value as any)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="YEAR">Yıllık</option>
            <option value="MONTH">Aylık</option>
            <option value="WEEK">Haftalık</option>
          </select>
        </div>
        
        <div className="space-y-1 border-l pl-3 border-slate-200">
          <label className="text-xs font-medium text-slate-500">Dönem 1</label>
          <select value={p1} onChange={e => setP1(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1 flex items-center h-8 mb-0.5 border-l pl-3 border-slate-200">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={isCompare} onChange={e => setIsCompare(e.target.checked)} className="rounded text-primary focus:ring-primary" />
            Kıyaslama
          </label>
        </div>

        {isCompare && (
          <div className="space-y-1 border-l pl-3 border-slate-200">
            <label className="text-xs font-medium text-slate-500">Dönem 2</label>
            <select value={p2} onChange={e => setP2(e.target.value)}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
              {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {canFilterGender && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Kol</label>
            <select value={gender} onChange={e => setGender(e.target.value)}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
              <option value="ALL">Birleşik (K+E)</option>
              <option value="K">Kadın Kolu</option>
              <option value="E">Erkek Kolu</option>
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Birim</label>
          <select value={unitId} onChange={e => setUnitId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm birimler</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Faaliyet türü</label>
          <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm faaliyetler</option>
            {activityTypes.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowTable(v => !v)}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5"
          >
            <TableIcon className="h-3.5 w-3.5" />
            {showTable ? 'Grafik' : 'Tablo'}
          </button>
          <button
            onClick={() => load()}
            disabled={isLoading}
            className="h-8 px-4 rounded-lg text-xs font-medium border border-transparent bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5"
            style={{ background: '#1B4E6B' }}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Uygula
          </button>
        </div>
      </div>

      {/* ── Yazdırma başlığı ── */}
      <div className="print-only mb-4 pb-3 border-b-2" style={{ borderColor: '#1B4E6B' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B4E6B, #16A34A)' }}>
              <span className="text-white font-bold">Gİ</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#0F1923' }}>
                GENÇ İHH — {provinceId === 0 ? 'Türkiye Karnesi' : 'İl Karnesi'}
              </h1>
              <p className="text-xs text-slate-500">
                {province.name} · {province.regionName} · {p1} · {d1?.weekCount ?? '—'} hafta
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString('tr-TR')}</p>
        </div>
      </div>

      {/* ── HERO: not + sıra ── */}
      {!hideScoreAndRank && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-avoid-break">
          {/* Harf notu */}
          <div className="premium-card p-5 text-center" style={{ background: grade.bg, borderColor: grade.color + '40' }}>
            <p className="text-5xl font-bold leading-none" style={{ color: grade.color, fontFamily: 'var(--font-sans)' }}>
              {grade.letter}
            </p>
            <p className="text-xs font-semibold mt-2" style={{ color: grade.color }}>{grade.label}</p>
            <p className="text-xs text-slate-500 mt-1">{karne.total} / 100 puan</p>
          </div>

          {/* İl */}
          <div className="premium-card p-5 text-center flex flex-col justify-center"
            style={{ background: 'linear-gradient(135deg, #1B4E6B, #2a6d94)' }}>
            <p className="text-2xl font-bold text-white leading-tight">{province.name.toLocaleUpperCase('tr')}</p>
            <p className="text-xs text-white/70 mt-1">{province.regionName}</p>
          </div>

          {/* Ulusal sıra */}
          <div className="premium-card p-5 text-center">
            <p className="text-4xl font-bold leading-none" style={{ color: '#1B4E6B' }}>
              {karne.rank}
              <span className="text-lg text-slate-300">/{d1?.nationalCount}</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Türkiye sıralaması</p>
          </div>

          {/* Bölge sırası */}
          <div className="premium-card p-5 text-center">
            <p className="text-4xl font-bold leading-none" style={{ color: '#16A34A' }}>
              {d1?.regionRank ?? '—'}
              <span className="text-lg text-slate-300">/{d1?.regionCount}</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">{province.regionName} sıralaması</p>
          </div>
        </div>
      )}

      {hideScoreAndRank && (
        <div className="premium-card p-5 text-center flex flex-col justify-center print-avoid-break mb-4"
          style={{ background: 'linear-gradient(135deg, #1B4E6B, #2a6d94)' }}>
          <p className="text-2xl font-bold text-white leading-tight">{province.name.toLocaleUpperCase('tr')}</p>
          <p className="text-xs text-white/70 mt-1">{province.regionName}</p>
        </div>
      )}

      {/* ── Ham göstergeler ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-avoid-break">
        {[
          { icon: Users, label: 'Toplam katılımcı', key: 'totalParticipants', color: '#16A34A' },
          { icon: Building2, label: 'Farklı kurum', key: 'institutionCount', color: '#2563EB' },
          { icon: BarChart3, label: 'Faaliyet kaydı', key: 'totalActivities', color: '#D97706' },
          { icon: CalendarCheck, label: 'Aktif hafta', key: 'activeWeeks', color: '#BE185D', stringVal: `${karne.activeWeeks}/${karne.totalWeeks}` },
        ].map((s: any) => (
          <div key={s.label} className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + '15' }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-800 leading-none flex items-center">
                {s.stringVal ? s.stringVal : formatNumber(karne[s.key as keyof typeof karne] as number)}
                {isCompare && d2?.karne && !s.stringVal && (
                  <DeltaBadge val1={karne[s.key as keyof typeof karne] as number} val2={d2.karne[s.key as keyof typeof karne] as number} />
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tespitler (analiz) ── */}
      {!hideScoreAndRank && (
        <Section title="Karne Değerlendirmesi" icon={Award} color="#1B4E6B"
          subtitle="Puanlardan otomatik çıkarılan tespitler">
          <div className="space-y-2">
            {(karne.insights ?? []).map((ins: any, i: number) => {
              const style = ins.kind === 'güçlü'
                ? { Icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' }
                : ins.kind === 'zayıf'
                  ? { Icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2' }
                  : { Icon: Minus, color: '#64748B', bg: '#F8FAFC' }
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: style.bg }}>
                  <style.Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: style.color }} />
                  <p className="text-sm text-slate-700">{ins.text}</p>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── 5 boyutlu karne profili ── */}
      {!hideScoreAndRank && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Karne Profili" icon={Award} color="#7C3AED"
            subtitle="5 boyutun 100 üzerinden görünümü">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={CHART_CHROME.grid} />
                <PolarAngleAxis dataKey="boyut" tick={{ fontSize: 10, fill: '#64748B' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <Radar dataKey="puan" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  formatter={(v: any) => [`${v} / 100`, 'Puan']}
                  contentStyle={CHART_CHROME.tooltip}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Boyut Puanları" icon={BarChart3} color="#2563EB"
            subtitle="Her boyutun toplam puandaki ağırlığı parantezde">
            <div className="space-y-3">
              {dimensionBars.map((d: any) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">
                      {d.name} <span className="text-slate-400">(%{d.weight * 100})</span>
                    </span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>{d.puan}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${d.puan}%`, background: d.color }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Birim bazlı ── */}
      <Section title="Birim Bazında Katılım" icon={Building2} color="#2563EB"
        subtitle="Hangi birimde kaç kişiye ulaşıldı">
        {unitBars.length === 0 ? <Empty text="Bu filtrelerde birim verisi yok" /> : isCompare && d2 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, compareByUnit.length * 56 + 30)}>
            <BarChart data={compareByUnit} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
              <XAxis type="number" tick={CHART_CHROME.tick} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={84} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={CHART_CHROME.tooltip} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey={p1} name="Dönem 1" fill="#1B4E6B" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey={p2} name="Dönem 2" fill="#94A3B8" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Birim</th><th className="text-right">Kurum</th><th className="text-right">Faaliyet</th><th className="text-right">Katılımcı</th></tr>
              </thead>
              <tbody>
                {unitBars.map((u: any) => (
                  <tr key={u.name}>
                    <td className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: unitColor(u.name) }} />
                      {u.name}
                    </td>
                    <td className="text-right tabular-nums">{u.kurum}</td>
                    <td className="text-right tabular-nums">{u.faaliyet}</td>
                    <td className="text-right tabular-nums font-semibold">{formatNumber(u.katılımcı)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, unitBars.length * 46 + 30)}>
            <BarChart data={unitBars} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
              <XAxis type="number" tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={84} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                formatter={(v: any, _n: any, p: any) => [
                  `${formatNumber(v)} kişi · ${p.payload.kurum} kurum · ${p.payload.faaliyet} faaliyet`,
                  p.payload.name,
                ]}
                contentStyle={CHART_CHROME.tooltip}
              />
              <Bar dataKey="katılımcı" radius={CHART_CHROME.barRadius} barSize={18}>
                {unitBars.map((u: any) => <Cell key={u.name} fill={unitColor(u.name)} />)}
                <LabelList dataKey="katılımcı" position="right"
                  formatter={(v: any) => formatNumber(v)}
                  style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Faaliyet türü ── */}
      <Section title="Faaliyet Türü Dağılımı" icon={BarChart3} color="#D97706"
        subtitle="Hangi tür çalışma ne kadar katılım getirdi">
        {activityBars.length === 0 ? <Empty text="Bu filtrelerde faaliyet verisi yok" /> : showTable ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Faaliyet türü</th><th className="text-right">Kayıt</th><th className="text-right">Katılımcı</th></tr>
              </thead>
              <tbody>
                {activityBars.map((a: any) => (
                  <tr key={a.name}>
                    <td className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: activityColor(a.name) }} />
                      {a.name}
                    </td>
                    <td className="text-right tabular-nums">{a.faaliyet}</td>
                    <td className="text-right tabular-nums font-semibold">{formatNumber(a.katılımcı)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, activityBars.length * 40 + 30)}>
            <BarChart data={activityBars} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
              <XAxis type="number" tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={104} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                formatter={(v: any, _n: any, p: any) => [`${formatNumber(v)} kişi · ${p.payload.faaliyet} kayıt`, p.payload.name]}
                contentStyle={CHART_CHROME.tooltip}
              />
              <Bar dataKey="katılımcı" radius={CHART_CHROME.barRadius} barSize={16}>
                {activityBars.map((a: any) => <Cell key={a.name} fill={activityColor(a.name)} />)}
                <LabelList dataKey="katılımcı" position="right"
                  formatter={(v: any) => formatNumber(v)}
                  style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Haftalık trend ── */}
      <Section title="Haftalık Katılım Seyri" icon={TrendingUp} color="#16A34A"
        subtitle="Süreklilik puanının dayandığı veri">
        {weekLine.length === 0 ? <Empty text="Henüz haftalık veri yok" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekLine} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
              <XAxis dataKey="hafta" tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}. hf`} />
              <YAxis tick={CHART_CHROME.tick} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <Tooltip
                formatter={(v: any) => [`${formatNumber(v)} kişi`, 'Katılımcı']}
                labelFormatter={l => `${l}. hafta`}
                contentStyle={CHART_CHROME.tooltip}
              />
              <Line type="monotone" dataKey="katılımcı" stroke="#16A34A" strokeWidth={2}
                dot={{ r: 3, fill: '#16A34A', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Kurum kırılımı — raporun asıl amacı ── */}
      <Section title="Kurum Kırılımı" icon={Building2} color="#1B4E6B" breakBefore
        subtitle="Hangi kurumda, hangi çalışma, kaç kişi — detay kaybolmaz">
        {(() => {
          const mergedInst = isCompare && d2 ? (() => {
            const allIds = new Set([...d1.institutions.map((i: any) => i.id), ...d2.institutions.map((i: any) => i.id)])
            return Array.from(allIds).map(id => {
              const i1 = d1.institutions.find((i: any) => i.id === id)
              const i2 = d2.institutions.find((i: any) => i.id === id)
              const base = i1 || i2
              return {
                ...base,
                t1: i1 ? i1.totalParticipants : 0,
                t2: i2 ? i2.totalParticipants : 0,
              }
            })
          })() : d1.institutions.map((i: any) => ({ ...i, t1: i.totalParticipants }))

          if (mergedInst.length === 0) return <Empty text="Bu filtrelerde kurum verisi yok" />

          return (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kurum</th>
                    <th>Birim</th>
                    <th>Tür</th>
                    {(!isCompare || !d2) && <th>Çalışmalar</th>}
                    <th className="text-right">{isCompare && d2 ? 'Dönem 1' : 'Toplam'}</th>
                    {isCompare && d2 && <th className="text-right">Dönem 2</th>}
                  </tr>
                </thead>
                <tbody>
                  {mergedInst.map((inst: any) => (
                    <tr key={`${inst.unitName}-${inst.name}`}>
                      <td className="font-medium text-slate-800">{inst.name}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ background: unitColor(inst.unitName) }} />
                          {inst.unitName}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{inst.schoolType ?? '—'}</td>
                      {(!isCompare || !d2) && (
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {inst.activities?.map((a: any) => (
                              <span key={a.type}
                                className="text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap"
                                style={{ background: activityColor(a.type) + '14', color: activityColor(a.type) }}>
                                {a.type}: {formatNumber(a.participants)}
                                {a.faculties?.length > 0 && ` (${a.faculties.join(', ')})`}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                      <td className="text-right font-bold tabular-nums" style={{ color: '#1B4E6B' }}>
                        {formatNumber(inst.t1)}
                      </td>
                      {isCompare && d2 && (
                        <td className="text-right font-bold tabular-nums" style={{ color: '#94A3B8' }}>
                          {formatNumber(inst.t2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </Section>

      {/* ── Teşkilat + hedefler + ilçe ── */}
      {provinceId !== 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="Teşkilat Durumu" icon={Shield} color="#7C3AED"
            subtitle={`${karne.orgFilled}/${karne.orgTotal} kadro dolu`}>
            <div className="flex flex-col gap-2">
              {ORG_LABELS.map((p: any) => {
                const active = orgStatus[p.key]
                const personName = orgNames[p.key]
                return (
                  <div key={p.key}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${
                      active ? 'bg-green-50/50 text-green-800 border-green-200'
                             : 'bg-slate-50/50 text-slate-400 border-slate-100'
                    }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {active
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                      <span className="font-semibold truncate">{p.label}</span>
                    </div>
                    <span className="text-xs text-slate-600 truncate font-normal max-w-[150px]">
                      {active ? 'Var' : 'Yok'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="İlçe Yayılımı" icon={MapPin} color="#D97706" subtitle="Genç İHH kaç ilçede aktif">
            {report ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'İldeki toplam ilçe', value: report.totalDistrictCount, color: '#94A3B8' },
                    { label: 'İHH bulunan ilçe', value: report.ihhDistrictCount, color: '#2563EB' },
                    { label: 'Genç İHH bulunan ilçe', value: report.gencIhhDistrictCount, color: '#16A34A' },
                  ].map((r: any) => {
                    const pct = report.totalDistrictCount
                      ? Math.round(((r.value ?? 0) / report.totalDistrictCount) * 100) : 0
                    return (
                      <div key={r.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-600">{r.label}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: r.color }}>{r.value ?? '—'}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {((report as any).districtDetails ?? []).length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">İlçe Detay Listesi</p>
                    <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {((report as any).districtDetails ?? []).map((d: any) => (
                        <div key={d.name} className="flex items-center justify-between py-1 px-2 rounded bg-slate-50 border border-slate-100 text-xs">
                          <span className="font-medium text-slate-700">{d.name}</span>
                          <div className="flex gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              d.hasIhh ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400'
                            }`}>İHH</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              d.hasGencIhh ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-100 text-slate-400'
                            }`}>Genç İHH</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <Empty text="İl künyesi girilmemiş" />}
          </Section>

          <Section title={`${p1}-${parseInt(p1) + 1} Hedefleri`} icon={Target} color="#BE185D"
            subtitle="İl künyesinden">
            {report ? (
              <div className="space-y-1">
                {TARGET_LABELS.map((t: any) => (
                  <div key={t.key} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-600">{t.label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: '#BE185D' }}>
                      {targets[t.key] ? formatNumber(targets[t.key]) + (t.suffix ?? '') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : <Empty text="İl künyesi girilmemiş" />}
          </Section>
        </div>
      )}

      {/* Yazdırma altbilgisi */}
      <p className="print-only text-xs text-slate-400 text-center pt-3 border-t border-slate-200">
        GENÇ İHH Raporlama Sistemi · {province.name} · {p1} · Otomatik üretilmiştir
      </p>
    </div>
  )
}

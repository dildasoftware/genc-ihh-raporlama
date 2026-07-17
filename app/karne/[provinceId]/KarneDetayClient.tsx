'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Printer, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus,
  Users, Building2, CalendarCheck, Target, Shield, CheckCircle2,
  XCircle, Award, MapPin, Table as TableIcon, BarChart3, Save, Check,
} from 'lucide-react'
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, LabelList,
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

interface Props {
  provinceId: number
  year: number
  units: { id: number; name: string }[]
  activityTypes: { id: number; name: string }[]
  canFilterGender: boolean
}

export default function KarneDetayClient({
  provinceId, year: initialYear, units, activityTypes, canFilterGender,
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [gender, setGender] = useState('ALL')
  const [unitId, setUnitId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (canFilterGender && gender !== 'ALL') params.set('gender', gender)
      if (unitId) params.set('unitId', unitId)
      if (activityTypeId) params.set('activityTypeId', activityTypeId)
      const res = await fetch(`/api/karne/${provinceId}?${params}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Karne alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [provinceId, year, gender, unitId, activityTypeId, canFilterGender])

  useEffect(() => { load() }, [load])

  // Filtre değişirse kaydedilmiş rapor artık bu görünümü temsil etmiyor
  useEffect(() => { setSavedId(null) }, [year, gender, unitId, activityTypeId])

  const karne = data?.karne
  const province = data?.province

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
          scopeType: 'PROVINCE',
          scopeId: province.id,
          scopeName: province.name,
          year,
          genderScope: canFilterGender ? gender : null,
          title: buildKarneTitle(province.name, year, canFilterGender && gender !== 'ALL' ? gender : null),
          summaryJson: buildKarneSummary(karne, data.nationalCount),
          snapshotJson: {
            karne,
            province,
            institutions: data.institutions,
            report: data.report,
            regionRank: data.regionRank,
            regionCount: data.regionCount,
            nationalCount: data.nationalCount,
            weekCount: data.weekCount,
            filters: { year, gender, unitId, activityTypeId },
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
    () => (karne ? DIMENSIONS.map(d => ({
      boyut: d.label,
      puan: Math.round(karne.scores[d.key]),
    })) : []),
    [karne]
  )

  const dimensionBars = useMemo(
    () => (karne ? DIMENSIONS.map(d => ({
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
        <Link href="/karne" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Tüm iller
        </Link>
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

  const report = data.report
  const orgStatus = (report?.orgStatus ?? {}) as Record<string, boolean>
  const targets = (report?.targets ?? {}) as Record<string, number>
  const grade = karne.grade

  return (
    <div className={`p-5 max-w-6xl mx-auto space-y-4 print-full ${isLoading ? 'opacity-60' : ''} transition-opacity`}>

      {/* ── Üst bar (yazdırılmaz) ── */}
      <div className="flex items-center justify-between no-print">
        <Link href="/karne" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Tüm iller
        </Link>
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
      <div className="filter-bar flex flex-wrap gap-3 items-end no-print">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Yıl</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Faaliyet türü</label>
          <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm faaliyetler</option>
            {activityTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowTable(v => !v)}
          className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50
                     flex items-center gap-1.5 transition-colors"
        >
          <TableIcon className="h-3.5 w-3.5" />
          {showTable ? 'Grafik görünümü' : 'Tablo görünümü'}
        </button>
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
              <h1 className="text-lg font-bold" style={{ color: '#0F1923' }}>GENÇ İHH — İl Karnesi</h1>
              <p className="text-xs text-slate-500">
                {province.name} · {province.regionName} · {year} · {data.weekCount} hafta
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString('tr-TR')}</p>
        </div>
      </div>

      {/* ── HERO: not + sıra ── */}
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
            <span className="text-lg text-slate-300">/{data.nationalCount}</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">Türkiye sıralaması</p>
        </div>

        {/* Bölge sırası */}
        <div className="premium-card p-5 text-center">
          <p className="text-4xl font-bold leading-none" style={{ color: '#16A34A' }}>
            {data.regionRank ?? '—'}
            <span className="text-lg text-slate-300">/{data.regionCount}</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">{province.regionName} sıralaması</p>
        </div>
      </div>

      {/* ── Ham göstergeler ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-avoid-break">
        {[
          { icon: Users, label: 'Toplam katılımcı', value: formatNumber(karne.totalParticipants), color: '#16A34A' },
          { icon: Building2, label: 'Farklı kurum', value: karne.institutionCount, color: '#2563EB' },
          { icon: BarChart3, label: 'Faaliyet kaydı', value: formatNumber(karne.totalActivities), color: '#D97706' },
          { icon: CalendarCheck, label: 'Aktif hafta', value: `${karne.activeWeeks}/${karne.totalWeeks}`, color: '#BE185D' },
        ].map(s => (
          <div key={s.label} className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + '15' }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-800 leading-none">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tespitler (analiz) ── */}
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

      {/* ── 5 boyutlu karne profili ── */}
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
            {dimensionBars.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">
                    {d.name} <span className="text-slate-400">(%{d.weight})</span>
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

      {/* ── Birim bazlı ── */}
      <Section title="Birim Bazında Katılım" icon={Building2} color="#2563EB"
        subtitle="Hangi birimde kaç kişiye ulaşıldı">
        {unitBars.length === 0 ? <Empty text="Bu filtrelerde birim verisi yok" /> : showTable ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Birim</th><th className="text-right">Kurum</th><th className="text-right">Faaliyet</th><th className="text-right">Katılımcı</th></tr>
              </thead>
              <tbody>
                {unitBars.map(u => (
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
                {unitBars.map(u => <Cell key={u.name} fill={unitColor(u.name)} />)}
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
                {activityBars.map(a => (
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
                {activityBars.map(a => <Cell key={a.name} fill={activityColor(a.name)} />)}
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
        {data.institutions.length === 0 ? <Empty text="Bu filtrelerde kurum verisi yok" /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kurum</th>
                  <th>Birim</th>
                  <th>Tür</th>
                  <th>Çalışmalar</th>
                  <th className="text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {data.institutions.map((inst: any) => (
                  <tr key={`${inst.unitName}-${inst.name}`}>
                    <td className="font-medium text-slate-800">{inst.name}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: unitColor(inst.unitName) }} />
                        {inst.unitName}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{inst.schoolType ?? '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {inst.activities.map((a: any) => (
                          <span key={a.type}
                            className="text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap"
                            style={{ background: activityColor(a.type) + '14', color: activityColor(a.type) }}>
                            {a.type}: {formatNumber(a.participants)}
                            {a.faculties.length > 0 && ` (${a.faculties.join(', ')})`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right font-bold tabular-nums" style={{ color: '#1B4E6B' }}>
                      {formatNumber(inst.totalParticipants)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Teşkilat + hedefler + ilçe ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Teşkilat Durumu" icon={Shield} color="#7C3AED"
          subtitle={`${karne.orgFilled}/${karne.orgTotal} kadro dolu`}>
          <div className="grid grid-cols-2 gap-1.5">
            {ORG_LABELS.map(p => {
              const active = orgStatus[p.key]
              return (
                <div key={p.key}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border ${
                    active ? 'bg-green-50 text-green-700 border-green-200'
                           : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                  {active
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span className="truncate">{p.label}</span>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="İlçe Yayılımı" icon={MapPin} color="#D97706" subtitle="Genç İHH kaç ilçede aktif">
          {report ? (
            <div className="space-y-3">
              {[
                { label: 'İldeki toplam ilçe', value: report.totalDistrictCount, color: '#94A3B8' },
                { label: 'İHH bulunan ilçe', value: report.ihhDistrictCount, color: '#2563EB' },
                { label: 'Genç İHH bulunan ilçe', value: report.gencIhhDistrictCount, color: '#16A34A' },
              ].map(r => {
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
          ) : <Empty text="İl künyesi girilmemiş" />}
        </Section>

        <Section title={`${year}-${year + 1} Hedefleri`} icon={Target} color="#BE185D"
          subtitle="İl künyesinden">
          {report ? (
            <div className="space-y-1">
              {TARGET_LABELS.map(t => (
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

      {/* Yazdırma altbilgisi */}
      <p className="print-only text-xs text-slate-400 text-center pt-3 border-t border-slate-200">
        GENÇ İHH Raporlama Sistemi · {province.name} · {year} · Otomatik üretilmiştir
      </p>
    </div>
  )
}

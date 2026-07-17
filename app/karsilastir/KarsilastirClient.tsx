'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BarChart2, Loader2, X, Plus, ExternalLink, ClipboardList, RotateCcw,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LabelList,
} from 'recharts'
import { DIMENSIONS } from '@/lib/karne'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chart-colors'
import { formatNumber } from '@/lib/utils'

/**
 * Karşılaştırma Çalışma Alanı
 *
 * Kullanıcı il veya bölge seçer (en fazla 5 — kategorik palet sınırı),
 * metrik seçer, aynı filtre kümesi tüm grafikleri besler:
 *   metrik çubuğu · haftalık seyir · karne profili (radar) · tam tablo
 * Her satır kaynak kayıtlara (faaliyetler / karne detay) drill-down verir.
 *
 * Renk kuralı: renk VARLIĞI izler, sırayı değil — bir seçim kaldırılınca
 * kalanlar rengini korur (colorMap slot mantığı).
 */

type Mode = 'il' | 'bolge'

const METRICS = [
  { key: 'total', label: 'Karne Puanı', fmt: (v: number) => String(v) },
  { key: 'totalParticipants', label: 'Katılımcı', fmt: (v: number) => formatNumber(v) },
  { key: 'totalActivities', label: 'Faaliyet', fmt: (v: number) => formatNumber(v) },
  { key: 'institutionCount', label: 'Kurum Sayısı', fmt: (v: number) => String(v) },
  { key: 'activeWeeks', label: 'Aktif Hafta', fmt: (v: number) => String(v) },
] as const
type MetricKey = typeof METRICS[number]['key']

interface Entity {
  key: string
  name: string
  provinceId?: number
  regionName?: string
  total: number
  grade: any
  rank?: number
  totalParticipants: number
  totalActivities: number
  institutionCount: number
  activeWeeks: number
  totalWeeks: number
  scores: Record<string, number>
  byWeek: Record<string, { participants: number; activities: number }>
}

interface Props {
  provinces: { id: number; name: string; regionName: string }[]
  units: { id: number; name: string }[]
  activityTypes: { id: number; name: string }[]
  canFilterGender: boolean
}

export default function KarsilastirClient({ provinces, units, activityTypes, canFilterGender }: Props) {
  const [mode, setMode] = useState<Mode>('il')
  const [year, setYear] = useState(new Date().getFullYear())
  const [gender, setGender] = useState('ALL')
  const [unitId, setUnitId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [metric, setMetric] = useState<MetricKey>('total')

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Seçim + renk slotları: ad → palet indeksi. Silinince slot boşalır,
  // kalanların rengi DEĞİŞMEZ (recolor-on-filter anti-pattern'i).
  const [selected, setSelected] = useState<string[]>([])
  const [colorMap, setColorMap] = useState<Record<string, number>>({})
  const [picker, setPicker] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (gender !== 'ALL') params.set('gender', gender)
      if (unitId) params.set('unitId', unitId)
      if (activityTypeId) params.set('activityTypeId', activityTypeId)
      const res = await fetch(`/api/karne?${params}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Veri alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [year, gender, unitId, activityTypeId])

  useEffect(() => { load() }, [load])

  // ── Varlıklar: il modu doğrudan ranked; bölge modu toplanmış ──
  const entities: Entity[] = useMemo(() => {
    const ranked: any[] = data?.ranked ?? []
    if (mode === 'il') {
      return ranked.map(r => ({
        key: r.provinceName,
        name: r.provinceName,
        provinceId: r.provinceId,
        regionName: r.regionName,
        total: r.total,
        grade: r.grade,
        rank: r.rank,
        totalParticipants: r.totalParticipants,
        totalActivities: r.totalActivities,
        institutionCount: r.institutionCount,
        activeWeeks: r.activeWeeks,
        totalWeeks: r.totalWeeks,
        scores: r.scores,
        byWeek: r.byWeek ?? {},
      }))
    }
    // Bölge modu: illeri bölgeye topla
    const byRegion = new Map<string, Entity & { _provinceCount: number }>()
    for (const r of ranked) {
      if (!byRegion.has(r.regionName)) {
        byRegion.set(r.regionName, {
          key: r.regionName, name: r.regionName,
          total: 0, grade: null, totalParticipants: 0, totalActivities: 0,
          institutionCount: 0, activeWeeks: 0, totalWeeks: r.totalWeeks,
          scores: Object.fromEntries(DIMENSIONS.map(d => [d.key, 0])),
          byWeek: {}, _provinceCount: 0,
        })
      }
      const e = byRegion.get(r.regionName)!
      e._provinceCount++
      e.total += r.total
      e.totalParticipants += r.totalParticipants
      e.totalActivities += r.totalActivities
      e.institutionCount += r.institutionCount
      e.activeWeeks = Math.max(e.activeWeeks, r.activeWeeks)
      for (const d of DIMENSIONS) e.scores[d.key] += r.scores[d.key]
      for (const [w, v] of Object.entries(r.byWeek ?? {}) as any) {
        if (!e.byWeek[w]) e.byWeek[w] = { participants: 0, activities: 0 }
        e.byWeek[w].participants += v.participants
        e.byWeek[w].activities += v.activities
      }
    }
    // Puan ve boyutlar bölge ortalaması (toplamı il sayısına bağlı olmasın)
    return [...byRegion.values()].map(e => ({
      ...e,
      total: Math.round((e.total / e._provinceCount) * 10) / 10,
      scores: Object.fromEntries(
        DIMENSIONS.map(d => [d.key, e.scores[d.key] / e._provinceCount])
      ),
    })).sort((a, b) => b.total - a.total)
  }, [data, mode])

  const entityByKey = useMemo(() => new Map(entities.map(e => [e.key, e])), [entities])
  const selectedEntities = selected.map(k => entityByKey.get(k)).filter(Boolean) as Entity[]
  const colorOf = (key: string) => CATEGORICAL[colorMap[key] ?? 0]

  const addEntity = (key: string) => {
    if (!key || selected.includes(key)) return
    if (selected.length >= CATEGORICAL.length) {
      toast.error(`En fazla ${CATEGORICAL.length} seçim`, {
        description: 'Renk paleti sınırı — okunabilirlik için daha fazlası karşılaştırılamaz.',
      })
      return
    }
    // İlk boş renk slotunu ata
    const used = new Set(selected.map(s => colorMap[s]))
    let slot = 0
    while (used.has(slot)) slot++
    setColorMap(m => ({ ...m, [key]: slot }))
    setSelected(s => [...s, key])
    setPicker('')
  }

  const removeEntity = (key: string) => setSelected(s => s.filter(x => x !== key))

  // Mod değişince seçim sıfırlanır (il adları ile bölge adları ayrı evren)
  useEffect(() => { setSelected([]); setColorMap({}) }, [mode])

  // Veri geldiğinde seçim boşsa ilk 3'ü otomatik seç — boş ekran olmasın
  useEffect(() => {
    if (entities.length > 0 && selected.length === 0) {
      const initial = entities.slice(0, 3).map(e => e.key)
      setColorMap(Object.fromEntries(initial.map((k, i) => [k, i])))
      setSelected(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities])

  // ── Grafik verileri ──
  const metricDef = METRICS.find(m => m.key === metric)!
  const barData = selectedEntities.map(e => ({
    name: e.name, value: e[metric] as number, key: e.key,
  }))

  const weekLineData = useMemo(() => {
    const weeks = new Set<number>()
    for (const e of selectedEntities) {
      for (const w of Object.keys(e.byWeek)) weeks.add(parseInt(w))
    }
    return [...weeks].sort((a, b) => a - b).map(w => {
      const row: any = { hafta: w }
      for (const e of selectedEntities) {
        row[e.name] = e.byWeek[w]?.participants ?? 0
      }
      return row
    })
  }, [selectedEntities])

  const radarData = useMemo(() =>
    DIMENSIONS.map(d => {
      const row: any = { boyut: d.label }
      for (const e of selectedEntities) row[e.name] = Math.round(e.scores[d.key])
      return row
    }), [selectedEntities])

  const available = entities.filter(e => !selected.includes(e.key))
  const selStyle = 'h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25'

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 gradient-text"
          style={{ fontFamily: 'Outfit, sans-serif' }}>
          <BarChart2 className="h-6 w-6" style={{ color: '#1B4E6B' }} />
          Karşılaştırma
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          İl veya bölgeleri yan yana koyun — puan, katılım, seyir ve karne profili tek ekranda.
        </p>
      </div>

      {/* ── Filtre satırı: kapsam herkes için ortak ── */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Karşılaştır</label>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(['il', 'bolge'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="px-3 h-8 text-xs font-medium transition-all"
                style={{ background: mode === m ? '#1B4E6B' : '#fff', color: mode === m ? '#fff' : '#64748b' }}>
                {m === 'il' ? 'İller' : 'Bölgeler'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Yıl</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={selStyle}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {canFilterGender && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Kol</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className={selStyle}>
              <option value="ALL">Birleşik</option>
              <option value="K">Kadın</option>
              <option value="E">Erkek</option>
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Birim</label>
          <select value={unitId} onChange={e => setUnitId(e.target.value)} className={selStyle}>
            <option value="">Tüm birimler</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Faaliyet türü</label>
          <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} className={selStyle}>
            <option value="">Tüm türler</option>
            {activityTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Metrik</label>
          <select value={metric} onChange={e => setMetric(e.target.value as MetricKey)} className={selStyle}>
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Seçim çipleri ── */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedEntities.map(e => (
          <span key={e.key}
            className="flex items-center gap-1.5 pl-2.5 pr-1.5 h-8 rounded-lg text-xs font-semibold border-2 bg-white"
            style={{ borderColor: colorOf(e.key), color: colorOf(e.key) }}>
            <span className="w-2 h-2 rounded-full" style={{ background: colorOf(e.key) }} />
            {e.name}
            <button onClick={() => removeEntity(e.key)} className="p-0.5 rounded hover:bg-slate-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {selected.length < CATEGORICAL.length && (
          <div className="flex items-center gap-1">
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <select value={picker} onChange={e => addEntity(e.target.value)} className={selStyle}>
              <option value="">{mode === 'il' ? 'İl ekle…' : 'Bölge ekle…'}</option>
              {available.map(e => (
                <option key={e.key} value={e.key}>
                  {e.name}{mode === 'il' && e.regionName ? ` (${e.regionName})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {selected.length > 0 && (
          <button onClick={() => { setSelected([]); setColorMap({}) }}
            className="h-8 px-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Sıfırla
          </button>
        )}
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
          <p className="text-sm text-slate-500">Veriler yükleniyor…</p>
        </div>
      ) : selectedEntities.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">Karşılaştırılacak {mode === 'il' ? 'il' : 'bölge'} seçin</p>
          <p className="text-sm text-slate-400 mt-1">Yukarıdaki menüden en fazla {CATEGORICAL.length} seçim yapabilirsiniz.</p>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-60' : ''}`}>

          {/* ── Metrik çubuğu ── */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">{metricDef.label} Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height={Math.max(120, barData.length * 52 + 30)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 64, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
                <XAxis type="number" tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                  tickFormatter={v => formatNumber(v)} />
                <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={92} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={CHART_CHROME.tooltip}
                  formatter={(v: any) => [metricDef.fmt(v), metricDef.label]} />
                <Bar dataKey="value" radius={CHART_CHROME.barRadius} barSize={20}>
                  {barData.map(d => <Cell key={d.key} fill={colorOf(d.key)} />)}
                  <LabelList dataKey="value" position="right"
                    formatter={(v: any) => metricDef.fmt(v)}
                    style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Haftalık seyir + radar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Haftalık Katılım Seyri</h3>
              {weekLineData.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Haftalık veri yok</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={weekLineData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
                    <XAxis dataKey="hafta" tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}.hf`} />
                    <YAxis tick={CHART_CHROME.tick} axisLine={false} tickLine={false}
                      tickFormatter={v => formatNumber(v)} />
                    <Tooltip contentStyle={CHART_CHROME.tooltip}
                      labelFormatter={l => `${l}. hafta`}
                      formatter={(v: any, name: any) => [formatNumber(v) + ' kişi', name]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedEntities.map(e => (
                      <Line key={e.key} type="monotone" dataKey={e.name}
                        stroke={colorOf(e.key)} strokeWidth={2}
                        dot={{ r: 2.5, fill: colorOf(e.key), strokeWidth: 1.5, stroke: '#fff' }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Karne Profili (5 Boyut)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke={CHART_CHROME.grid} />
                  <PolarAngleAxis dataKey="boyut" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={CHART_CHROME.tooltip} formatter={(v: any, n: any) => [`${v}/100`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {selectedEntities.map(e => (
                    <Radar key={e.key} name={e.name} dataKey={e.name}
                      stroke={colorOf(e.key)} fill={colorOf(e.key)} fillOpacity={0.12} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tam karşılaştırma tablosu + drill-down ── */}
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Tüm Metrikler</h3>
              <p className="text-xs text-slate-400 mt-0.5">Her satırdan kaynak kayıtlara inebilirsiniz</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{mode === 'il' ? 'İl' : 'Bölge'}</th>
                    {mode === 'il' && <th className="text-center">Sıra</th>}
                    <th className="text-center">Not</th>
                    <th className="text-right">Puan</th>
                    <th className="text-right">Katılımcı</th>
                    <th className="text-right">Faaliyet</th>
                    <th className="text-right">Kurum</th>
                    <th className="text-right">Aktif Hafta</th>
                    {DIMENSIONS.map(d => <th key={d.key} className="text-right">{d.label.split(' ')[0]}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntities.map(e => (
                    <tr key={e.key}>
                      <td>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorOf(e.key) }} />
                          {e.name}
                        </span>
                      </td>
                      {mode === 'il' && (
                        <td className="text-center tabular-nums text-slate-600">{e.rank ?? '—'}</td>
                      )}
                      <td className="text-center">
                        {e.grade ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{ background: e.grade.bg, color: e.grade.color }}>
                            {e.grade.letter}
                          </span>
                        ) : <span className="text-xs text-slate-400">ort.</span>}
                      </td>
                      <td className="text-right font-bold tabular-nums" style={{ color: '#1B4E6B' }}>{e.total}</td>
                      <td className="text-right tabular-nums">{formatNumber(e.totalParticipants)}</td>
                      <td className="text-right tabular-nums">{formatNumber(e.totalActivities)}</td>
                      <td className="text-right tabular-nums">{e.institutionCount}</td>
                      <td className="text-right tabular-nums">{e.activeWeeks}/{e.totalWeeks}</td>
                      {DIMENSIONS.map(d => (
                        <td key={d.key} className="text-right tabular-nums text-slate-600">
                          {Math.round(e.scores[d.key])}
                        </td>
                      ))}
                      <td>
                        <div className="flex items-center gap-1.5 justify-end">
                          {e.provinceId && (
                            <Link href={`/karne/${e.provinceId}?year=${year}`}
                              className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                              style={{ background: '#EFF6FF', color: '#1B4E6B' }}>
                              <ExternalLink className="h-3 w-3" /> Karne
                            </Link>
                          )}
                          <Link
                            href={e.provinceId
                              ? `/faaliyetler?year=${year}&provinceId=${e.provinceId}`
                              : `/faaliyetler?year=${year}`}
                            className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                            style={{ background: '#F0FDF4', color: '#16A34A' }}>
                            <ClipboardList className="h-3 w-3" /> Kayıtlar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

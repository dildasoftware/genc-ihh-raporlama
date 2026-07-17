'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BarChart2, Loader2, X, Plus, ExternalLink, ClipboardList, TrendingUp,
  PieChart as PieChartIcon, Activity
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie
} from 'recharts'
import { DIMENSIONS } from '@/lib/karne'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chart-colors'
import { formatNumber } from '@/lib/utils'

type Mode = 'il' | 'bolge' | 'birim' | 'faaliyetTuru'

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
  const [weekFrom, setWeekFrom] = useState('')
  const [weekTo, setWeekTo] = useState('')
  
  // Eger mode birim/faaliyet ise total anlamsiz
  const [metric, setMetric] = useState<MetricKey>('total')

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [selected, setSelected] = useState<string[]>([])
  const [colorMap, setColorMap] = useState<Record<string, number>>({})
  const [picker, setPicker] = useState('')

  useEffect(() => {
    if ((mode === 'birim' || mode === 'faaliyetTuru') && metric === 'total') {
      setMetric('totalParticipants')
    }
    if ((mode === 'il' || mode === 'bolge') && (metric !== 'total' && metric !== 'totalParticipants' && metric !== 'totalActivities' && metric !== 'institutionCount' && metric !== 'activeWeeks')) {
        setMetric('total')
    }
  }, [mode, metric])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (gender !== 'ALL') params.set('gender', gender)
      if (unitId) params.set('unitId', unitId)
      if (activityTypeId) params.set('activityTypeId', activityTypeId)
      if (weekFrom) params.set('weekFrom', weekFrom)
      if (weekTo) params.set('weekTo', weekTo)

      let res
      if (mode === 'il' || mode === 'bolge') {
        res = await fetch(`/api/karne?${params}`)
      } else {
        params.set('groupBy', mode === 'birim' ? 'unit' : 'activityType')
        res = await fetch(`/api/kesif?${params}`)
      }
      
      if (!res.ok) throw new Error((await res.json()).error ?? 'Veri alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [year, gender, unitId, activityTypeId, weekFrom, weekTo, mode])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPicker('') }, [year, gender, unitId, activityTypeId, weekFrom, weekTo])

  const entities: Entity[] = useMemo(() => {
    if (!data) return []
    
    if (mode === 'il' || mode === 'bolge') {
      const ranked: any[] = data?.ranked ?? []
      if (mode === 'il') {
        return ranked.map(r => ({
          key: r.provinceName, name: r.provinceName, provinceId: r.provinceId, regionName: r.regionName,
          total: r.total, grade: r.grade, rank: r.rank, totalParticipants: r.totalParticipants,
          totalActivities: r.totalActivities, institutionCount: r.institutionCount, activeWeeks: r.activeWeeks,
          totalWeeks: r.totalWeeks, scores: r.scores, byWeek: r.byWeek ?? {},
        }))
      }
      const byRegion = new Map<string, Entity & { _provinceCount: number }>()
      for (const r of ranked) {
        if (!byRegion.has(r.regionName)) {
          byRegion.set(r.regionName, {
            key: r.regionName, name: r.regionName, total: 0, grade: null, totalParticipants: 0, totalActivities: 0,
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
      return [...byRegion.values()].map(e => ({
        ...e, total: Math.round((e.total / e._provinceCount) * 10) / 10,
        scores: Object.fromEntries(DIMENSIONS.map(d => [d.key, e.scores[d.key] / e._provinceCount])),
      })).sort((a, b) => b.total - a.total)
    } 
    
    // birim or faaliyetTuru (from kesif API)
    const grouped: any[] = data?.grouped ?? []
    return grouped.map(g => ({
        key: g.key, name: g.label, total: 0, grade: null, totalParticipants: g.participants,
        totalActivities: g.count, institutionCount: 0, activeWeeks: Object.keys(g.byWeek || {}).length,
        totalWeeks: 52, scores: {}, byWeek: g.byWeek || {}
    }))

  }, [data, mode])

  const entityByKey = useMemo(() => new Map(entities.map(e => [e.key, e])), [entities])
  const selectedEntities = selected.map(k => entityByKey.get(k)).filter(Boolean) as Entity[]
  const colorOf = (key: string) => CATEGORICAL[colorMap[key] ?? 0]

  const addEntity = (key: string) => {
    if (!key || selected.includes(key)) return
    if (selected.length >= CATEGORICAL.length) {
      toast.error(`En fazla ${CATEGORICAL.length} seçim`, { description: 'Renk paleti sınırı.' })
      return
    }
    const used = new Set(selected.map(s => colorMap[s]))
    let slot = 0
    while (used.has(slot)) slot++
    setColorMap(m => ({ ...m, [key]: slot }))
    setSelected(s => [...s, key])
    setPicker('')
  }

  const removeEntity = (key: string) => setSelected(s => s.filter(x => x !== key))

  useEffect(() => { setSelected([]); setColorMap({}) }, [mode])

  useEffect(() => {
    if (entities.length > 0 && selected.length === 0) {
      const initial = entities.slice(0, 3).map(e => e.key)
      setColorMap(Object.fromEntries(initial.map((k, i) => [k, i])))
      setSelected(initial)
    }
  }, [entities, mode])

  const isKarneMode = mode === 'il' || mode === 'bolge'
  const isBirimFaaliyet = mode === 'birim' || mode === 'faaliyetTuru'

  const weekKeys = useMemo(() => {
    const ws = new Set<number>()
    for (const e of selectedEntities) {
      for (const w of Object.keys(e.byWeek)) ws.add(parseInt(w))
    }
    return Array.from(ws).sort((a, b) => a - b)
  }, [selectedEntities])

  const weekLineData = useMemo(() => {
    return weekKeys.map(w => {
      const row: any = { hafta: w }
      for (const e of selectedEntities) {
        const v = e.byWeek[String(w)]
        row[e.name] = v ? (metric === 'totalActivities' ? v.activities : v.participants) : 0
      }
      return row
    })
  }, [weekKeys, selectedEntities, metric])

  const radarData = useMemo(() => {
    return DIMENSIONS.map(d => {
      const row: any = { boyut: d.label.split(' ')[0] }
      for (const e of selectedEntities) row[e.name] = e.scores[d.key] || 0
      return row
    })
  }, [selectedEntities])

  const pieData = useMemo(() => {
      return entities.slice(0, 10).map((e, i) => ({
          name: e.name,
          value: metric === 'totalActivities' ? e.totalActivities : e.totalParticipants,
          fill: CATEGORICAL[i % CATEGORICAL.length]
      }))
  }, [entities, metric])

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-800">
            <BarChart2 className="h-7 w-7 text-indigo-600" />
            Süper Analiz
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gelişmiş kırılımlar, trendler ve karşılaştırmalar</p>
        </div>
        
        {/* MOD SECICI */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl">
          {[{k:'il', l:'İl'}, {k:'bolge', l:'Bölge'}, {k:'birim', l:'Birim'}, {k:'faaliyetTuru', l:'Faaliyet'}].map(m => (
            <button key={m.k} onClick={() => setMode(m.k as Mode)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === m.k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}>
              {m.l}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Yıl</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Hafta Aralığı</label>
            <div className="flex items-center gap-1">
              <input type="number" placeholder="İlk" value={weekFrom} onChange={e => setWeekFrom(e.target.value)}
                className="h-9 w-16 px-2 text-sm border border-slate-200 rounded-lg outline-none bg-white text-center" min={1} max={53} />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder="Son" value={weekTo} onChange={e => setWeekTo(e.target.value)}
                className="h-9 w-16 px-2 text-sm border border-slate-200 rounded-lg outline-none bg-white text-center" min={1} max={53} />
            </div>
          </div>
          {canFilterGender && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Cinsiyet</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none bg-white">
                <option value="ALL">Birleşik</option>
                <option value="K">Kadın Kolu</option>
                <option value="E">Erkek Kolu</option>
              </select>
            </div>
          )}
          {mode !== 'birim' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Birim</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none bg-white">
                <option value="">Tümü</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          {mode !== 'faaliyetTuru' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Faaliyet Türü</label>
              <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none bg-white">
                <option value="">Tümü</option>
                {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-500">Süper analiz yükleniyor...</p>
        </div>
      ) : (
        <div className="space-y-6 fade-in">
          <div className="premium-card p-5">
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-start mb-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Karşılaştırılacak {mode === 'il' ? 'İller' : mode === 'bolge' ? 'Bölgeler' : mode === 'birim' ? 'Birimler' : 'Faaliyet Türleri'}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {METRICS.filter(m => isKarneMode || (m.key !== 'total' && m.key !== 'institutionCount')).map(m => (
                      <button key={m.key} onClick={() => setMetric(m.key)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          metric === m.key ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50' : 'text-slate-500 hover:bg-slate-50'
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedEntities.map(e => (
                    <div key={e.key} className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-sm font-medium border"
                      style={{ background: `${colorOf(e.key)}10`, borderColor: `${colorOf(e.key)}20`, color: colorOf(e.key) }}>
                      <span>{e.name}</span>
                      <button onClick={() => removeEntity(e.key)}
                        className="p-1 rounded-full hover:bg-black/5 transition-colors"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {selectedEntities.length < CATEGORICAL.length && (
                    <div className="relative">
                      <select value={picker} onChange={e => addEntity(e.target.value)}
                        className="appearance-none pl-8 pr-4 py-1.5 text-sm font-medium border-2 border-dashed border-slate-200 rounded-full text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-transparent outline-none cursor-pointer">
                        <option value="" disabled>Ekle...</option>
                        {entities.filter(e => !selected.includes(e.key)).map(e => (
                          <option key={e.key} value={e.key}>{e.name}</option>
                        ))}
                      </select>
                      <Plus className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={selectedEntities} margin={{ top: 10, bottom: 20, left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_CHROME.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={v => formatNumber(v)} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={CHART_CHROME.tooltip}
                  formatter={(v: any) => [METRICS.find(m => m.key === metric)?.fmt(v as number) ?? v, METRICS.find(m => m.key === metric)?.label]} />
                <Bar dataKey={metric} radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {selectedEntities.map((entry) => <Cell key={entry.key} fill={colorOf(entry.key)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Haftalık Seyir
              </h3>
              {weekLineData.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Haftalık veri yok</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={weekLineData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
                    <XAxis dataKey="hafta" tick={CHART_CHROME.tick} axisLine={false} tickLine={false} tickFormatter={v => `${v}.hf`} />
                    <YAxis tick={CHART_CHROME.tick} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
                    <Tooltip contentStyle={CHART_CHROME.tooltip} labelFormatter={l => `${l}. hafta`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedEntities.map(e => (
                      <Line key={e.key} type="monotone" dataKey={e.name} stroke={colorOf(e.key)} strokeWidth={2}
                        dot={{ r: 2.5, fill: colorOf(e.key), strokeWidth: 1.5, stroke: '#fff' }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="premium-card p-5">
              {isKarneMode ? (
                <>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" /> Karne Profili (5 Boyut)
                  </h3>
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
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-indigo-500" /> Genel Dağılım
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={CHART_CHROME.tooltip} formatter={(v: any) => formatNumber(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Tüm Metrikler</h3>
                <p className="text-xs text-slate-400 mt-0.5">Seçili olan öğelerin tam dökümü</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>İsim</th>
                    {isKarneMode && <th className="text-center">Not</th>}
                    {isKarneMode && <th className="text-right">Puan</th>}
                    <th className="text-right">Katılımcı</th>
                    <th className="text-right">Faaliyet</th>
                    {isKarneMode && <th className="text-right">Kurum</th>}
                    {isKarneMode && <th className="text-right">Aktif Hafta</th>}
                    {isKarneMode && DIMENSIONS.map(d => <th key={d.key} className="text-right">{d.label.split(' ')[0]}</th>)}
                    <th style={{ textAlign: 'right' }}>Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntities.map(e => (
                    <tr key={e.key}>
                      <td style={{ textAlign: 'left' }}>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorOf(e.key) }} />
                          {e.name}
                        </span>
                      </td>
                      {isKarneMode && (
                        <td className="text-center">
                          {e.grade ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md inline-block min-w-[28px]"
                              style={{ background: e.grade.bg, color: e.grade.color }}>
                              {e.grade.letter}
                            </span>
                          ) : <span className="text-xs text-slate-400">ort.</span>}
                        </td>
                      )}
                      {isKarneMode && <td className="text-right font-bold tabular-nums text-indigo-600">{e.total}</td>}
                      <td className="text-right tabular-nums">{formatNumber(e.totalParticipants)}</td>
                      <td className="text-right tabular-nums">{formatNumber(e.totalActivities)}</td>
                      {isKarneMode && <td className="text-right tabular-nums">{e.institutionCount}</td>}
                      {isKarneMode && <td className="text-right tabular-nums">{e.activeWeeks}/{e.totalWeeks}</td>}
                      {isKarneMode && DIMENSIONS.map(d => (
                        <td key={d.key} className="text-right tabular-nums text-slate-600">
                          {Math.round(e.scores[d.key])}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {e.provinceId && (
                            <Link href={`/karne/${e.provinceId}?year=${year}`}
                              className="px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs">
                              <ExternalLink className="h-3 w-3" /> Karne
                            </Link>
                          )}
                          {isKarneMode && (
                              <Link
                                href={e.provinceId ? `/faaliyetler?year=${year}&provinceId=${e.provinceId}` : `/faaliyetler?year=${year}`}
                                className="px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-xs">
                                <ClipboardList className="h-3 w-3" /> Kayıtlar
                              </Link>
                          )}
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

'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Award, Printer, ChevronDown, ChevronUp, RefreshCw, ExternalLink,
  TrendingUp, TrendingDown, Users, Building2, BarChart3, Table as TableIcon,
  Trophy, MapPin,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import { getRoleLabel, type SessionUser } from '@/lib/authz'
import { CHART_CHROME } from '@/lib/chart-colors'
import { DIMENSIONS } from '@/lib/karne'

interface Ref { id: number; name: string }
interface Props {
  user: SessionUser
  year: number
  units: Ref[]
  activityTypes: Ref[]
  regions: Ref[]
}

const RANK_MEDAL = ['🥇', '🥈', '🥉']

export default function KarneClient({ user, year: initialYear, units, activityTypes, regions }: Props) {
  const canFilterGender = user.role !== 'IL_KOORDINATOR'

  const [year, setYear] = useState(initialYear)
  const [gender, setGender] = useState('ALL')
  const [regionId, setRegionId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [sortBy, setSortBy] = useState<'total' | 'participants' | 'institutions'>('total')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (canFilterGender && gender !== 'ALL') params.set('gender', gender)
      if (regionId) params.set('regionId', regionId)
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
  }, [year, gender, regionId, unitId, activityTypeId, canFilterGender])

  useEffect(() => { load() }, [load])

  const ranked: any[] = useMemo(() => {
    const list = [...(data?.ranked ?? [])]
    list.sort((a, b) => {
      if (sortBy === 'participants') return b.totalParticipants - a.totalParticipants
      if (sortBy === 'institutions') return b.institutionCount - a.institutionCount
      return b.total - a.total
    })
    return list
  }, [data, sortBy])

  const summary = data?.summary
  const top3 = ranked.slice(0, 3)

  // İlk 15 il — boyut kırılımı yerine toplam puanla, harf notu renkli
  const barData = useMemo(
    () => ranked.slice(0, 15).map(r => ({
      name: r.provinceName.length > 10 ? r.provinceName.slice(0, 10) + '…' : r.provinceName,
      fullName: r.provinceName,
      puan: r.total,
      grade: r.grade.letter,
      color: r.grade.color,
    })),
    [ranked]
  )

  const SortBtn = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button
      onClick={() => setSortBy(col)}
      className="px-2.5 h-8 text-xs font-medium rounded-lg transition-all"
      style={{
        background: sortBy === col ? '#1B4E6B' : '#fff',
        color: sortBy === col ? '#fff' : '#64748b',
        border: '1px solid #E2E8F0',
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5 print-full">

      {/* ── Başlık ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Award className="h-6 w-6" style={{ color: '#1B4E6B' }} />
            <span className="gradient-text">İl Karneleri — {year}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {getRoleLabel(user.role)} · 5 boyutlu değerlendirme · ulusal sıralama
            {data && !data.isNationalView && ' · yalnızca yetkili olduğunuz iller'}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
          style={{ background: '#1B4E6B' }}
        >
          <Printer className="h-4 w-4" /> PDF
        </button>
      </div>

      {/* ── Filtreler: genelden özele ── */}
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
          <label className="text-xs font-medium text-slate-500">Bölge</label>
          <select value={regionId} onChange={e => setRegionId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm bölgeler</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
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
        <div className="flex-1" />
        <button onClick={load} disabled={isLoading}
          className="h-8 px-3 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
          style={{ background: '#1B4E6B' }}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {/* ── Ülke özeti ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: 'İl', value: summary.provinceCount, color: '#1B4E6B' },
            { icon: Users, label: 'Toplam katılımcı', value: formatNumber(summary.totalParticipants), color: '#16A34A' },
            { icon: Building2, label: 'Farklı kurum', value: formatNumber(summary.institutionCount), color: '#2563EB' },
            { icon: BarChart3, label: 'Ortalama puan', value: summary.avgScore, color: '#D97706' },
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
      )}

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
          <p className="text-sm text-slate-500">Karneler hesaplanıyor…</p>
        </div>
      ) : ranked.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">Bu filtrelerde veri yok</p>
          <p className="text-sm text-slate-400 mt-1">Haftalık rapor girildikçe karneler oluşur.</p>
        </div>
      ) : (
        <div className={`space-y-5 ${isLoading ? 'opacity-60' : ''} transition-opacity`}>

          {/* ── Podyum ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item, i) => (
              <div key={item.provinceId} className="premium-card p-5 relative overflow-hidden"
                style={{ borderTop: `3px solid ${item.grade.color}` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl mb-1">{RANK_MEDAL[i]}</p>
                    <p className="font-bold text-base text-slate-800">{item.provinceName}</p>
                    <p className="text-xs text-slate-400">{item.regionName}</p>
                  </div>
                  <div className="text-center rounded-xl px-3 py-2" style={{ background: item.grade.bg }}>
                    <p className="text-2xl font-bold leading-none" style={{ color: item.grade.color }}>{item.grade.letter}</p>
                    <p className="text-xs mt-0.5" style={{ color: item.grade.color }}>{item.total}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-sm font-bold text-slate-700">{formatNumber(item.totalParticipants)}</p>
                    <p className="text-xs text-slate-400">Katılımcı</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-sm font-bold text-slate-700">{item.institutionCount}</p>
                    <p className="text-xs text-slate-400">Kurum</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-sm font-bold text-slate-700">{item.activeWeeks}/{item.totalWeeks}</p>
                    <p className="text-xs text-slate-400">Hafta</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── İlk 15 il grafiği ── */}
          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Trophy className="h-4 w-4" style={{ color: '#1B4E6B' }} /> En yüksek puanlı 15 il
              </h3>
              <span className="text-xs text-slate-400">Renk = harf notu</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 26 + 30)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 44, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
                <XAxis type="number" domain={[0, 100]} tick={CHART_CHROME.tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={86} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  formatter={(v: any, _n, p: any) => [`${v} puan · ${p.payload.grade}`, p.payload.fullName]}
                  contentStyle={CHART_CHROME.tooltip}
                />
                <Bar dataKey="puan" radius={CHART_CHROME.barRadius} barSize={16}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="grade" position="right" style={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Tam sıralama ── */}
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Tam sıralama <span className="text-slate-400 font-normal">({ranked.length} il)</span>
              </h3>
              <div className="flex items-center gap-2 no-print">
                <span className="text-xs text-slate-400">Sırala:</span>
                <SortBtn col="total" label="Puan" />
                <SortBtn col="participants" label="Katılımcı" />
                <SortBtn col="institutions" label="Kurum" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>İl</th>
                    <th>Bölge</th>
                    <th className="text-center">Not</th>
                    <th className="text-right">Puan</th>
                    <th className="text-right">Katılımcı</th>
                    <th className="text-right">Kurum</th>
                    <th className="text-right">Hafta</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((item, i) => {
                    const isExp = expanded === item.provinceId
                    return (
                      // key fragment'te olmalı — iki <tr> döndüğü için
                      <Fragment key={item.provinceId}>
                        <tr
                          className="cursor-pointer"
                          onClick={() => setExpanded(isExp ? null : item.provinceId)}>
                          <td>
                            <span className="font-bold text-xs" style={{ color: i < 3 ? item.grade.color : '#94A3B8' }}>
                              {item.rank}
                            </span>
                          </td>
                          <td className="font-semibold text-slate-800">{item.provinceName}</td>
                          <td>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.regionName}</span>
                          </td>
                          <td className="text-center">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                              style={{ background: item.grade.bg, color: item.grade.color }}>
                              {item.grade.letter}
                            </span>
                          </td>
                          <td className="text-right font-bold tabular-nums" style={{ color: '#1B4E6B' }}>{item.total}</td>
                          <td className="text-right tabular-nums text-slate-600">{formatNumber(item.totalParticipants)}</td>
                          <td className="text-right tabular-nums text-slate-600">{item.institutionCount}</td>
                          <td className="text-right tabular-nums text-slate-500">{item.activeWeeks}/{item.totalWeeks}</td>
                          <td>
                            {isExp ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                          </td>
                        </tr>
                        {isExp && (
                          <tr key={`${item.provinceId}-d`}>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                                {/* Boyut mini-çubukları */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                                  {DIMENSIONS.map(d => (
                                    <div key={d.key} className="bg-white rounded-lg p-2.5 border border-slate-100">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium text-slate-600">{d.label}</span>
                                        <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>
                                          {Math.round(item.scores[d.key])}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full" style={{ background: '#F1F5F9' }}>
                                        <div className="h-full rounded-full"
                                          style={{ width: `${Math.round(item.scores[d.key])}%`, background: d.color }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Tespitler + link */}
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                  <ul className="text-xs text-slate-600 space-y-1 flex-1 min-w-[240px]">
                                    {(item.insights ?? []).slice(0, 3).map((ins: any, k: number) => (
                                      <li key={k} className="flex items-start gap-1.5">
                                        {ins.kind === 'güçlü'
                                          ? <TrendingUp className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                          : ins.kind === 'zayıf'
                                            ? <TrendingDown className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                                            : <span className="w-3.5 shrink-0" />}
                                        {ins.text}
                                      </li>
                                    ))}
                                  </ul>
                                  <Link href={`/karne/${item.provinceId}`}
                                    onClick={e => e.stopPropagation()}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
                                    style={{ background: '#EFF6FF', color: '#1B4E6B' }}>
                                    <ExternalLink className="h-3.5 w-3.5" /> Detaylı karne
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { TrendingUp, Bot, Users, Activity, Download, RefreshCw, BarChart3, ArrowUp, ArrowDown } from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import { getRoleLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

interface Props {
  user: SessionUser
  year: number
  units: { id: number; name: string }[]
  activityTypes: { id: number; name: string }[]
}

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'Birleşik (K+E)' },
  { value: 'K', label: 'Kadın Kolu' },
  { value: 'E', label: 'Erkek Kolu' },
]

export default function TrendClient({ user, year, units, activityTypes }: Props) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [gender, setGender] = useState('ALL')
  const [weeks, setWeeks] = useState('12')
  const [unitId, setUnitId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area')
  const printRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async (g = gender, w = weeks, u = unitId, a = activityTypeId) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: year.toString(), weeks: w })
      if (g !== 'ALL') params.set('gender', g)
      if (u) params.set('unitId', u)
      if (a) params.set('activityTypeId', a)
      const res = await fetch(`/api/trend?${params}`)
      if (!res.ok) throw new Error('Veri alınamadı')
      setData(await res.json())
    } catch (e: any) { toast.error(e.message) }
    finally { setIsLoading(false) }
  }, [year, gender, weeks, unitId, activityTypeId])

  useEffect(() => { loadData() }, [loadData])

  // PDF = native print (html2canvas Tailwind v4 lab() renklerinde patlıyor)
  const handlePdf = useCallback(() => window.print(), [])

  const chartData = data?.trend?.map((t: any) => ({
    hafta: `H${t.weekNo}`,
    katılımcı: t.participants,
    faaliyet: t.count,
    kadın: t.kadın,
    erkek: t.erkek,
    activityDetails: t.activityDetails,
  })) ?? []

  const totalP = chartData.reduce((s: number, d: any) => s + d.katılımcı, 0)
  const totalA = chartData.reduce((s: number, d: any) => s + d.faaliyet, 0)
  const avgPerWeek = chartData.length > 0 ? Math.round(totalP / chartData.length) : 0
  const last = chartData[chartData.length - 1]
  const prev = chartData[chartData.length - 2]
  const weekChange = last && prev && prev.katılımcı > 0
    ? ((last.katılımcı - prev.katılımcı) / prev.katılımcı * 100)
    : null

  // Monthly summary
  const monthMap: Record<number, { total: number; count: number }> = {}
  data?.trend?.forEach((t: any) => {
    if (!monthMap[t.month]) monthMap[t.month] = { total: 0, count: 0 }
    monthMap[t.month].total += t.participants
    monthMap[t.month].count += t.count
  })
  const monthlyData = Object.entries(monthMap).map(([m, v]) => ({
    ay: ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][parseInt(m)],
    katılımcı: v.total,
    faaliyet: v.count,
  }))

  async function runAiAnalysis() {
    if (!data) return
    setIsAnalyzing(true)
    setAiResponse('')
    try {
      const res = await fetch('/api/ai-analiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TREND', scopeType: 'COUNTRY',
          contextData: {
            yil: year, kol: gender,
            haftalikTrend: data.trend?.slice(-8).map((t: any) => ({ hafta: t.weekNo, katilimci: t.participants, faaliyet: t.count })),
            toplamKatilimci: totalP, toplamFaaliyet: totalA, haftaBasinaOrtalama: avgPerWeek,
          },
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const json = await res.json()
      setAiResponse(json.response)
    } catch (e: any) { toast.error(e.message) }
    finally { setIsAnalyzing(false) }
  }

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : AreaChart

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <TrendingUp className="h-6 w-6" style={{ color: '#1B4E6B' }} />
            <span className="gradient-text">Trend Analizi — {year}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{getRoleLabel(user.role)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: '#1B4E6B' }}>
            <Download className="h-4 w-4" />PDF
          </button>
          <button onClick={runAiAnalysis} disabled={isAnalyzing || !data}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: '#16A34A', color: '#16A34A' }}>
            <Bot className="h-4 w-4" />{isAnalyzing ? 'Analiz...' : 'AI Yorum'}
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cinsiyet Kolu</label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none">
            {GENDER_OPTIONS.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Birim</label>
          <select value={unitId} onChange={e => setUnitId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none">
            <option value="">Tüm birimler</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Faaliyet Türü</label>
          <select value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none">
            <option value="">Tüm türler</option>
            {activityTypes.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Son Hafta Sayısı</label>
          <select value={weeks} onChange={e => setWeeks(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none">
            {['4','8','12','24','52'].map((w: any) => <option key={w} value={w}>{w} hafta</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Grafik Türü</label>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(['area','bar','line'] as const).map((t: any) => (
              <button key={t} onClick={() => setChartType(t)}
                className="px-3 h-8 text-xs font-medium transition-all"
                style={{ background: chartType === t ? '#1B4E6B' : '#fff', color: chartType === t ? '#fff' : '#64748B' }}>
                {t === 'area' ? 'Alan' : t === 'bar' ? 'Sütun' : 'Çizgi'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => loadData(gender, weeks, unitId, activityTypeId)} disabled={isLoading}
          className="flex items-center gap-1 h-8 px-4 rounded-lg text-xs font-medium text-white" style={{ background: '#1B4E6B' }}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Yükleniyor' : 'Uygula'}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Katılımcı', value: formatNumber(totalP), icon: Users, color: '#1B4E6B' },
          { label: 'Toplam Faaliyet', value: formatNumber(totalA), icon: Activity, color: '#16A34A' },
          { label: 'Haftalık Ortalama', value: formatNumber(avgPerWeek), icon: TrendingUp, color: '#D97706' },
          { label: 'Son Hafta', value: formatNumber(last?.katılımcı ?? 0), icon: weekChange !== null && weekChange >= 0 ? ArrowUp : ArrowDown,
            color: weekChange !== null && weekChange >= 0 ? '#16A34A' : '#DC2626',
            sub: weekChange !== null ? `${weekChange > 0 ? '+' : ''}${weekChange.toFixed(1)}% (önceki haftaya)` : '' },
        ].map(({ label, value, icon: Icon, color, sub }: any) => (
          <div key={label} className="premium-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{label}</p>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* AI Yanıt */}
      {aiResponse && (
        <div className="premium-card p-4 border-l-4" style={{ borderLeftColor: '#16A34A' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4" style={{ color: '#16A34A' }} />
            <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>AI Trend Analizi</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
        </div>
      )}

      {/* Print Area */}
      <div ref={printRef} className="space-y-5">
        {/* Ana Trend Grafiği */}
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: '#1B4E6B' }} />
            Katılımcı Trendi
            <span className="text-xs font-normal text-slate-400 ml-1">
              ({gender === 'K' ? 'Kadın Kolu' : gender === 'E' ? 'Erkek Kolu' : 'Birleşik'}, son {weeks} hafta)
            </span>
          </h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" style={{ color: '#1B4E6B' }} />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">Veri bulunamadı</div>
          ) : chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="hafta" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('tr-TR')} />
                <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {gender === 'ALL' ? (
                  <>
                    <Bar dataKey="kadın" name="Kadın" stackId="a" fill="#BE185D" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="erkek" name="Erkek" stackId="a" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="katılımcı" name="Katılımcı" fill="#1B4E6B" radius={[4, 4, 0, 0]}>
                    {chartData.map((_: any, i: number) => <Cell key={i} fill={i === chartData.length - 1 ? '#16A34A' : '#1B4E6B'} />)}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === 'line' ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hafta" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('tr-TR')} />
                <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {gender === 'ALL' ? (
                  <>
                    <Line type="monotone" dataKey="kadın" name="Kadın" stroke="#BE185D" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="erkek" name="Erkek" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3 }} />
                  </>
                ) : (
                  <Line type="monotone" dataKey="katılımcı" name="Katılımcı" stroke="#1B4E6B" strokeWidth={2.5} dot={{ r: 4 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  {['kadın', 'erkek', 'katılımcı'].map((k, i) => (
                    <linearGradient key={k} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={['#BE185D','#1D4ED8','#1B4E6B'][i]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={['#BE185D','#1D4ED8','#1B4E6B'][i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hafta" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('tr-TR')} />
                <Tooltip formatter={(v: any) => formatNumber(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {gender === 'ALL' ? (
                  <>
                    <Area type="monotone" dataKey="kadın" name="Kadın" stroke="#BE185D" fill="url(#grad0)" strokeWidth={2} />
                    <Area type="monotone" dataKey="erkek" name="Erkek" stroke="#1D4ED8" fill="url(#grad1)" strokeWidth={2} />
                  </>
                ) : (
                  <Area type="monotone" dataKey="katılımcı" name="Katılımcı" stroke="#1B4E6B" fill="url(#grad2)" strokeWidth={2.5} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* İki Kolon: Faaliyet Sayısı + Aylık Özet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Faaliyet Sayısı */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: '#16A34A' }} />
              Faaliyet Sayısı
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="hafta" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="faaliyet" name="Faaliyet" fill="#16A34A" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aylık Özet */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: '#D97706' }} />
              Aylık Özet
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {monthlyData.map((m, i) => (
                <div key={m.ay} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-8">{m.ay}</span>
                  <div className="flex-1">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(m.katılımcı / (monthlyData[0]?.katılımcı || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-20 text-right">{formatNumber(m.katılımcı)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Haftalık Tablo */}
        {chartData.length > 0 && (
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Haftalık Detay Tablosu</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hafta</th>
                    <th className="text-right">Faaliyet</th>
                    <th className="text-right">Katılımcı</th>
                    {gender === 'ALL' && <>
                      <th className="text-right">Kadın</th>
                      <th className="text-right">Erkek</th>
                    </>}
                    <th className="text-right">Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d: any, i: number) => {
                    const prev = chartData[i - 1]
                    const chg = prev && prev.katılımcı > 0
                      ? ((d.katılımcı - prev.katılımcı) / prev.katılımcı * 100)
                      : null
                    return (
                      <tr key={d.hafta}>
                        <td className="font-medium text-slate-800">{d.hafta}</td>
                        <td className="text-right text-slate-600">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-slate-800">{formatNumber(d.faaliyet)}</span>
                            {d.activityDetails && Object.entries(d.activityDetails).map(([name, val]: any) => (
                              <span key={name} className="text-[10px] text-slate-400">{name}: {val.count}</span>
                            ))}
                          </div>
                        </td>
                        <td className="text-right font-semibold" style={{ color: '#1B4E6B' }}>{formatNumber(d.katılımcı)}</td>
                        {gender === 'ALL' && <>
                          <td className="text-right text-pink-700">{formatNumber(d.kadın)}</td>
                          <td className="text-right text-blue-700">{formatNumber(d.erkek)}</td>
                        </>}
                        <td className="text-right">
                          {chg !== null ? (
                            <span className="text-xs font-medium" style={{ color: chg >= 0 ? '#16A34A' : '#DC2626' }}>
                              {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

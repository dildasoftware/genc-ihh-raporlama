'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Award, Crown, Filter, Download, Bot, ChevronDown, ChevronUp,
  Users, Activity, BarChart3, TrendingUp, TrendingDown, Minus,
  MapPin, Building2, RefreshCw, Printer, ExternalLink
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LineChart, Line, Legend
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import { getRoleLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

interface Props {
  user: SessionUser
  year: number
  units: any[]
}

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'Birleşik (K+E)' },
  { value: 'K', label: 'Kadın Kolu' },
  { value: 'E', label: 'Erkek Kolu' },
]

const UNIT_COLORS: Record<string, string> = {
  'Üniversite': '#1B4E6B',
  'Lise':       '#16A34A',
  'Ortaokul':   '#D97706',
  'Çocuk':      '#BE185D',
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#D97706']
const RANK_LABELS = ['🥇 1. Sıra', '🥈 2. Sıra', '🥉 3. Sıra']

export default function KarneClient({ user, year, units }: Props) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [gender, setGender] = useState('ALL')
  const [unitId, setUnitId] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'activities' | 'participants'>('score')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [regionFilter, setRegionFilter] = useState('')
  const [view, setView] = useState<'table' | 'chart'>('table')
  const printRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async (g = gender, u = unitId) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: year.toString() })
      if (g !== 'ALL') params.set('gender', g)
      if (u) params.set('unitId', u)
      const res = await fetch(`/api/karne?${params}`)
      if (!res.ok) throw new Error('Veri alınamadı')
      setData(await res.json())
    } catch (e: any) { toast.error(e.message) }
    finally { setIsLoading(false) }
  }, [year, gender, unitId])

  useEffect(() => { loadData() }, [])

  // Download PDF using browser print
  const handlePdf = useCallback(async () => {
    const jspdf = await import('jspdf')
    const html2canvas = await import('html2canvas')
    const { default: jsPDF } = jspdf
    const { default: h2c } = html2canvas

    if (!printRef.current) return
    toast.loading('PDF hazırlanıyor...')

    try {
      const canvas = await h2c(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width

      let yPos = 0
      let pageHeight = pdf.internal.pageSize.getHeight()

      // Multiple pages if needed
      while (yPos < h) {
        if (yPos > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yPos, w, h)
        yPos += pageHeight
      }

      pdf.save(`GENC-IHH-Karne-${year}-${gender}.pdf`)
      toast.dismiss()
      toast.success('PDF indirildi!')
    } catch (e: any) {
      toast.dismiss()
      toast.error('PDF hatası: ' + e.message)
    }
  }, [year, gender])

  async function runAiAnalysis() {
    if (!data) return
    setIsAnalyzing(true)
    setAiResponse('')
    try {
      const res = await fetch('/api/ai-analiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'KARNE',
          scopeType: 'COUNTRY',
          contextData: {
            yil: year, kol: gender,
            ilSirasi: data.ranked.slice(0, 15).map((r: any) => ({
              il: r.provinceName, bolge: r.regionName,
              puan: Math.round(r.totalScore),
              faaliyet: r.totalActivities,
              katilimci: r.totalParticipants,
            })),
          },
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const json = await res.json()
      setAiResponse(json.response)
    } catch (e: any) { toast.error(e.message) }
    finally { setIsAnalyzing(false) }
  }

  // Sort + filter
  let ranked: any[] = data?.ranked ?? []
  if (regionFilter) ranked = ranked.filter((r: any) => r.regionName === regionFilter)
  ranked = [...ranked].sort((a, b) => {
    const va = sortBy === 'score' ? a.totalScore : sortBy === 'activities' ? a.totalActivities : a.totalParticipants
    const vb = sortBy === 'score' ? b.totalScore : sortBy === 'activities' ? b.totalActivities : b.totalParticipants
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const maxScore = ranked[0]?.totalScore || 1
  const regions = [...new Set((data?.ranked ?? []).map((r: any) => r.regionName))] as string[]
  const top3 = (data?.ranked ?? []).slice(0, 3)

  // Bar chart data (top 20)
  const barData = ranked.slice(0, 20).map((r: any) => ({
    name: r.provinceName.length > 8 ? r.provinceName.slice(0, 8) + '…' : r.provinceName,
    fullName: r.provinceName,
    puan: Math.round(r.totalScore),
    katılımcı: r.totalParticipants,
    faaliyet: r.totalActivities,
  }))

  // Region summary chart
  const regionData = Object.entries(
    (data?.ranked ?? []).reduce((acc: any, r: any) => {
      if (!acc[r.regionName]) acc[r.regionName] = { region: r.regionName, puan: 0, il: 0 }
      acc[r.regionName].puan += r.totalScore
      acc[r.regionName].il++
      return acc
    }, {})
  ).map(([, v]: any) => ({ ...v, puan: Math.round(v.puan / v.il) }))
    .sort((a: any, b: any) => b.puan - a.puan)

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <span className="opacity-30">↕</span>
    return sortDir === 'desc' ? <TrendingDown className="h-3 w-3 inline" /> : <TrendingUp className="h-3 w-3 inline" />
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* ── Başlık ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Award className="h-6 w-6" style={{ color: '#1B4E6B' }} />
            <span className="gradient-text">İl Karnesi — {year}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{getRoleLabel(user.role)} · Ağırlıklı puan sıralaması</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={handlePdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#1B4E6B', color: '#fff' }}>
            <Download className="h-4 w-4" />PDF İndir
          </button>
          <button onClick={runAiAnalysis} disabled={isAnalyzing || !data}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
            style={{ borderColor: '#16A34A', color: '#16A34A' }}>
            <Bot className="h-4 w-4" />
            {isAnalyzing ? 'Analiz...' : 'AI Analiz'}
          </button>
        </div>
      </div>

      {/* ── Filtreler ── */}
      <div className="filter-bar flex flex-wrap gap-3 items-end no-print">
        {/* Cinsiyet */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cinsiyet Kolu</label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none">
            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {/* Birim */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Birim</label>
          <select value={unitId} onChange={e => setUnitId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none">
            <option value="">Tüm birimler</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        {/* Bölge */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Bölge</label>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none">
            <option value="">Tüm bölgeler</option>
            {regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {/* Görünüm */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Görünüm</label>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(['table', 'chart'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 h-8 text-xs font-medium transition-all"
                style={{ background: view === v ? '#1B4E6B' : '#fff', color: view === v ? '#fff' : '#64748b' }}>
                {v === 'table' ? 'Tablo' : 'Grafik'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => loadData(gender, unitId)} disabled={isLoading}
          className="flex items-center gap-1 h-8 px-4 rounded-lg text-xs font-medium text-white transition-all"
          style={{ background: '#1B4E6B' }}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Yükleniyor' : 'Uygula'}
        </button>
      </div>

      {/* ── PDF Print Area ── */}
      <div ref={printRef}>

        {/* PDF Başlığı (sadece PDF'de görünür) */}
        <div className="hidden print-only mb-6 pb-4 border-b-2" style={{ borderColor: '#1B4E6B' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1B4E6B, #16A34A)' }}>
              <span className="text-white font-bold text-lg">Gİ</span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0F1923' }}>GENÇ İHH İl Karne Raporu</h1>
              <p className="text-sm text-slate-500">{year} Yılı · {GENDER_OPTIONS.find(o => o.value === gender)?.label} · Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>

        {/* AI Yanıt */}
        {aiResponse && (
          <div className="premium-card p-4 border-l-4" style={{ borderLeftColor: '#16A34A' }}>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4" style={{ color: '#16A34A' }} />
              <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>AI Karne Analizi</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
            <p className="text-sm text-slate-500">Puanlar hesaplanıyor...</p>
          </div>
        ) : ranked.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-slate-500">Bu filtreler için veri bulunamadı</p>
          </div>
        ) : (
          <>
            {/* ── Top 3 Podium ── */}
            <div className="grid grid-cols-3 gap-4 stagger-children">
              {top3.map((item: any, i: number) => (
                <div key={item.provinceId}
                  className="premium-card p-5 text-center animate-fade-in-up relative overflow-hidden"
                  style={{ borderTop: `3px solid ${RANK_COLORS[i]}` }}>
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-5"
                    style={{ background: `radial-gradient(circle, ${RANK_COLORS[i]}, transparent)` }} />
                  <p className="text-lg mb-1">{['🥇', '🥈', '🥉'][i]}</p>
                  <p className="font-bold text-base" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>{item.provinceName}</p>
                  <p className="text-xs text-slate-400 mb-3">{item.regionName}</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: RANK_COLORS[i] }}>
                    {Math.round(item.totalScore).toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400 mb-3">puan</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="font-semibold text-slate-700">{formatNumber(item.totalActivities)}</p>
                      <p className="text-slate-400">Faaliyet</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="font-semibold text-slate-700">{formatNumber(item.totalParticipants)}</p>
                      <p className="text-slate-400">Katılımcı</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Bölge Özeti ── */}
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: '#1B4E6B' }} />
                Bölge Bazında Ortalama Puan
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={regionData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [Math.round(v).toLocaleString('tr-TR') + ' puan', 'Ort. Puan']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="puan" radius={[6, 6, 0, 0]}>
                    {regionData.map((_: any, i: number) => (
                      <Cell key={i} fill={['#1B4E6B', '#2a6d94', '#16A34A', '#D97706', '#BE185D', '#7C3AED', '#0891B2'][i % 7]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Görünüm: Tablo veya Grafik ── */}
            {view === 'chart' ? (
              <div className="premium-card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: '#1B4E6B' }} />
                  İl Puanları (İlk 20)
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.toLocaleString('tr-TR')} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any, name: any) => [(v as number).toLocaleString('tr-TR'), name === 'puan' ? 'Puan' : name === 'katılımcı' ? 'Katılımcı' : 'Faaliyet']}
                      labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="puan" name="Puan" radius={[0, 6, 6, 0]}>
                      {barData.map((_: any, i: number) => (
                        <Cell key={i} fill={i < 3 ? RANK_COLORS[i] : '#1B4E6B'} opacity={i >= 3 ? 0.7 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* ── Tablo ── */
              <div className="premium-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Tam Sıralama <span className="text-slate-400 font-normal">({ranked.length} il)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Satıra tıklayarak birim detayını görebilir, &quot;Detay Karne&quot; ile tam karne sayfasına gidebilirsiniz</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>İl</th>
                        <th>Bölge</th>
                        <th onClick={() => toggleSort('score')} className="cursor-pointer select-none text-right">
                          Puan <SortIcon col="score" />
                        </th>
                        <th onClick={() => toggleSort('activities')} className="cursor-pointer select-none text-right">
                          Faaliyet <SortIcon col="activities" />
                        </th>
                        <th onClick={() => toggleSort('participants')} className="cursor-pointer select-none text-right">
                          Katılımcı <SortIcon col="participants" />
                        </th>
                        <th className="w-40">Puan Çubuğu</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((item: any, i: number) => {
                        const isExpanded = expandedRow === item.provinceId
                        const scorePercent = (item.totalScore / maxScore) * 100

                        // Radar data
                        const radarData = Object.entries(item.byUnit ?? {}).map(([name, d]: any) => ({
                          subject: name,
                          puan: Math.round(d.score),
                          faaliyet: d.count,
                        }))

                        return (
                          <>
                            <tr key={item.provinceId}
                              className={`province-row ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => setExpandedRow(isExpanded ? null : item.provinceId)}
                              style={{ cursor: 'pointer' }}>
                              <td>
                                <span className="font-bold text-xs"
                                  style={{ color: i < 3 ? RANK_COLORS[i] : '#94A3B8' }}>
                                  {i + 1}
                                </span>
                              </td>
                              <td>
                                <span className="font-semibold text-slate-800">{item.provinceName}</span>
                              </td>
                              <td>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  {item.regionName}
                                </span>
                              </td>
                              <td className="text-right">
                                <span className="font-bold text-sm" style={{ color: '#1B4E6B' }}>
                                  {Math.round(item.totalScore).toLocaleString('tr-TR')}
                                </span>
                              </td>
                              <td className="text-right text-slate-600">{formatNumber(item.totalActivities)}</td>
                              <td className="text-right text-slate-600">{formatNumber(item.totalParticipants)}</td>
                              <td>
                                <div className="progress-bar">
                                  <div className="progress-fill" style={{ width: `${scorePercent}%` }} />
                                </div>
                              </td>
                              <td className="flex items-center gap-1">
                                <Link href={`/karne/${item.provinceId}`}
                                  className="px-2 py-1 rounded-md text-xs font-medium transition-all hover:shadow-sm flex items-center gap-1"
                                  style={{ background: '#EFF6FF', color: '#1B4E6B' }}
                                  onClick={e => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3" /> Detay
                                </Link>
                                {isExpanded
                                  ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                                  : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                              </td>
                            </tr>

                            {/* Expanded Detail Row */}
                            {isExpanded && (
                              <tr key={`${item.provinceId}-detail`}>
                                <td colSpan={8} style={{ padding: 0 }}>
                                  <div className="p-4 bg-blue-50/50 border-t border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">

                                    {/* Birim Kartları */}
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Birim Bazında Dağılım</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(item.byUnit ?? {}).map(([unitName, d]: any) => (
                                          <div key={unitName} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className="w-2.5 h-2.5 rounded-full"
                                                style={{ background: UNIT_COLORS[unitName] ?? '#94A3B8' }} />
                                              <span className="text-xs font-semibold text-slate-700">{unitName}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-center">
                                              <div>
                                                <p className="text-sm font-bold" style={{ color: '#1B4E6B' }}>
                                                  {Math.round(d.score).toLocaleString('tr-TR')}
                                                </p>
                                                <p className="text-xs text-slate-400">Puan</p>
                                              </div>
                                              <div>
                                                <p className="text-sm font-bold text-slate-700">{d.count}</p>
                                                <p className="text-xs text-slate-400">Faaliyet</p>
                                              </div>
                                              <div>
                                                <p className="text-sm font-bold text-slate-700">{formatNumber(d.participants)}</p>
                                                <p className="text-xs text-slate-400">Kişi</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Radar Chart */}
                                    {radarData.length > 1 && (
                                      <div>
                                        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Radar</p>
                                        <ResponsiveContainer width="100%" height={160}>
                                          <RadarChart data={radarData}>
                                            <PolarGrid stroke="#E2E8F0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748B' }} />
                                            <PolarRadiusAxis tick={{ fontSize: 8 }} />
                                            <Radar dataKey="puan" stroke="#1B4E6B" fill="#1B4E6B" fillOpacity={0.3} />
                                          </RadarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tablo Alt: Özet İstatistik */}
                <div className="px-5 py-3 border-t border-slate-100 flex gap-6 text-xs text-slate-500">
                  <span>Toplam: <strong className="text-slate-700">{ranked.length} il</strong></span>
                  <span>Toplam Puan: <strong className="text-slate-700">{Math.round(ranked.reduce((s: number, r: any) => s + r.totalScore, 0)).toLocaleString('tr-TR')}</strong></span>
                  <span>Toplam Faaliyet: <strong className="text-slate-700">{formatNumber(ranked.reduce((s: number, r: any) => s + r.totalActivities, 0))}</strong></span>
                  <span>Toplam Katılımcı: <strong className="text-slate-700">{formatNumber(ranked.reduce((s: number, r: any) => s + r.totalParticipants, 0))}</strong></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

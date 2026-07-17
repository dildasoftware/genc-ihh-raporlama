'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Search, Download, BarChart3, Table2, Grid3x3, RefreshCw, TrendingUp, Users, Activity, ChevronUp, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/utils'
import { getRoleLabel, getGenderLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

interface Props {
  user: SessionUser
  periods: any[]
  units: any[]
  activityTypes: any[]
  currentPeriodId: number | null
  initialData: { total: { count: number; participants: number }; grouped: any[] }
}

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'Birleşik (K+E)' },
  { value: 'K', label: 'Kadın Kolu' },
  { value: 'E', label: 'Erkek Kolu' },
]

const GROUP_OPTIONS = [
  { value: 'province', label: 'İl' },
  { value: 'unit', label: 'Birim' },
  { value: 'activityType', label: 'Faaliyet Türü' },
]

const COLORS = ['#1B4E6B','#2a6d94','#16A34A','#22c55e','#D97706','#BE185D','#7C3AED','#0891B2','#DC2626','#059669']

type ViewMode = 'bar' | 'table' | 'heatmap'
type SortKey = 'participants' | 'count' | 'label'

export default function KesifClient({ user, periods, units, activityTypes, currentPeriodId, initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('bar')
  const [sortKey, setSortKey] = useState<SortKey>('participants')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const printRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState({
    periodId: currentPeriodId?.toString() ?? '',
    periodIdEnd: '',
    gender: 'ALL',
    unitId: '',
    activityTypeId: '',
    groupBy: 'province',
  })

  const applyFilters = useCallback(async (f = filters) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.periodId) params.set('periodId', f.periodId)
      if (f.gender !== 'ALL') params.set('gender', f.gender)
      if (f.unitId) params.set('unitId', f.unitId)
      if (f.activityTypeId) params.set('activityTypeId', f.activityTypeId)
      params.set('groupBy', f.groupBy)
      const res = await fetch(`/api/kesif?${params}`)
      if (!res.ok) throw new Error('Veri alınamadı')
      setData(await res.json())
    } catch (e: any) { toast.error(e.message) }
    finally { setIsLoading(false) }
  }, [filters])

  const handlePdf = useCallback(async () => {
    if (!printRef.current) return
    toast.loading('PDF hazırlanıyor...')
    try {
      const html2canvasModule = await import('html2canvas')
      const jspdfModule = await import('jspdf')
      const canvas = await html2canvasModule.default(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jspdfModule.default({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      pdf.save(`GENC-IHH-Kesif-${new Date().toLocaleDateString('tr-TR')}.pdf`)
      toast.dismiss()
      toast.success('PDF indirildi!')
    } catch (e: any) { toast.dismiss(); toast.error('PDF hatası') }
  }, [])

  // Filter + sort
  let items = data.grouped.filter(g =>
    !searchTerm || g.label.toLowerCase().includes(searchTerm.toLowerCase())
  )
  items = [...items].sort((a, b) => {
    const va = sortKey === 'label' ? a.label.localeCompare(b.label) : (sortKey === 'count' ? a.count - b.count : a.participants - b.participants)
    if (sortKey === 'label') return sortDir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)
    return sortDir === 'desc' ? (sortKey === 'count' ? b.count - a.count : b.participants - a.participants)
      : (sortKey === 'count' ? a.count - b.count : a.participants - b.participants)
  })

  const chartData = items.slice(0, 25).map(g => ({
    name: g.label.length > 10 ? g.label.slice(0, 10) + '…' : g.label,
    fullName: g.label,
    katılımcı: g.participants,
    faaliyet: g.count,
  }))

  const SortBtn = ({ col }: { col: SortKey }) => (
    <button onClick={() => { if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(col); setSortDir('desc') } }}
      className="inline-flex items-center gap-0.5">
      {col === 'label' ? 'İsim' : col === 'count' ? 'Faaliyet' : 'Katılımcı'}
      {sortKey === col ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <span className="opacity-30 text-xs">↕</span>}
    </button>
  )

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Search className="h-6 w-6" style={{ color: '#1B4E6B' }} />
            <span className="gradient-text">Keşif — Drill-Down Analiz</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{getRoleLabel(user.role)}{user.genderBranch ? ` · ${getGenderLabel(user.genderBranch)}` : ''}</p>
        </div>
        <button onClick={handlePdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#1B4E6B' }}>
          <Download className="h-4 w-4" />PDF İndir
        </button>
      </div>

      {/* Filtre Bar */}
      <div className="filter-bar">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Dönem</label>
            <select value={filters.periodId} onChange={e => setFilters(f => ({ ...f, periodId: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary">
              <option value="">Tüm dönemler</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.year}/H{p.weekNo}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Cinsiyet</label>
            <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary">
              {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Birim</label>
            <select value={filters.unitId} onChange={e => setFilters(f => ({ ...f, unitId: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary">
              <option value="">Tüm birimler</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Faaliyet Türü</label>
            <select value={filters.activityTypeId} onChange={e => setFilters(f => ({ ...f, activityTypeId: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary">
              <option value="">Tüm türler</option>
              {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Gruplama</label>
            <select value={filters.groupBy} onChange={e => setFilters(f => ({ ...f, groupBy: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary">
              {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={() => applyFilters(filters)} disabled={isLoading}
            className="flex items-center gap-1 h-8 px-4 rounded-lg text-xs font-medium text-white"
            style={{ background: '#1B4E6B' }}>
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Yükleniyor' : 'Uygula'}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Faaliyet', value: formatNumber(data.total.count), color: '#1B4E6B', icon: Activity },
          { label: 'Toplam Katılımcı', value: formatNumber(data.total.participants), color: '#16A34A', icon: Users },
          { label: 'Grup Sayısı', value: formatNumber(items.length), color: '#D97706', icon: Grid3x3 },
          { label: 'Ort. Katılımcı/Grup', value: formatNumber(items.length ? Math.round(data.total.participants / items.length) : 0), color: '#BE185D', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="premium-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{label}</p>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Görünüm Seçici + Arama */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {([['bar', <BarChart3 key="b" className="h-3.5 w-3.5" />, 'Bar Grafik'],
             ['table', <Table2 key="t" className="h-3.5 w-3.5" />, 'Tablo'],
             ['heatmap', <Grid3x3 key="h" className="h-3.5 w-3.5" />, 'Heatmap'],
          ] as const).map(([v, icon, label]) => (
            <button key={v} onClick={() => setViewMode(v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
              style={{ background: viewMode === v ? '#1B4E6B' : '#fff', color: viewMode === v ? '#fff' : '#64748B' }}>
              {icon}{label}
            </button>
          ))}
        </div>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Ara..."
          className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-primary w-48"
        />
      </div>

      {/* Print Area */}
      <div ref={printRef}>
        {isLoading ? (
          <div className="premium-card p-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin" style={{ color: '#1B4E6B' }} />
            <p className="text-sm text-slate-500">Veri yükleniyor...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-slate-500">Sonuç bulunamadı</p>
          </div>
        ) : (
          <>
            {/* Bar Grafik */}
            {viewMode === 'bar' && (
              <div className="premium-card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  Katılımcı Dağılımı <span className="text-slate-400 font-normal">(İlk 25)</span>
                </h3>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 40, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.toLocaleString('tr-TR')} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip
                      labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
                      formatter={(v: any, name: any) => [formatNumber(v), name === 'katılımcı' ? 'Katılımcı' : 'Faaliyet']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <Bar dataKey="katılımcı" name="Katılımcı" radius={[0, 6, 6, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85 + (i === 0 ? 0.15 : 0)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tablo */}
            {viewMode === 'table' && (
              <div className="premium-card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700">Detaylı Liste ({items.length} kayıt)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th><SortBtn col="label" /></th>
                        <th className="text-right"><SortBtn col="count" /></th>
                        <th className="text-right"><SortBtn col="participants" /></th>
                        <th className="w-48">Oran</th>
                        <th className="text-right">Ort. Katılımcı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const pct = data.total.participants > 0 ? (item.participants / data.total.participants) * 100 : 0
                        const maxP = items[0]?.participants || 1
                        return (
                          <tr key={item.key}>
                            <td className="font-mono text-xs text-slate-400">{i + 1}</td>
                            <td><span className="font-medium text-slate-800">{item.label}</span></td>
                            <td className="text-right text-slate-600">{formatNumber(item.count)}</td>
                            <td className="text-right font-semibold" style={{ color: '#1B4E6B' }}>{formatNumber(item.participants)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="progress-bar flex-1">
                                  <div className="progress-fill" style={{ width: `${(item.participants / maxP) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="text-right text-slate-600">
                              {item.count > 0 ? formatNumber(Math.round(item.participants / item.count)) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC', fontWeight: 600 }}>
                        <td colSpan={2} className="px-3 py-2 text-xs text-slate-600">TOPLAM</td>
                        <td className="text-right text-xs text-slate-700">{formatNumber(data.total.count)}</td>
                        <td className="text-right text-xs font-bold" style={{ color: '#1B4E6B' }}>{formatNumber(data.total.participants)}</td>
                        <td />
                        <td className="text-right text-xs text-slate-600">
                          {data.total.count > 0 ? formatNumber(Math.round(data.total.participants / data.total.count)) : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Heatmap (basit renk yoğunluğu grid) */}
            {viewMode === 'heatmap' && (
              <div className="premium-card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Katılımcı Yoğunluğu Haritası</h3>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(80px, 1fr))` }}>
                  {items.slice(0, 60).map((item, i) => {
                    const maxP = items[0]?.participants || 1
                    const intensity = item.participants / maxP
                    const alpha = 0.08 + intensity * 0.92
                    return (
                      <div key={item.key} title={`${item.label}: ${formatNumber(item.participants)} kişi, ${item.count} faaliyet`}
                        className="heatmap-cell flex flex-col items-center justify-center p-2 text-center cursor-pointer"
                        style={{
                          background: `rgba(27, 78, 107, ${alpha})`,
                          color: intensity > 0.5 ? '#fff' : '#1B4E6B',
                          minHeight: 64,
                        }}>
                        <p className="text-xs font-bold leading-tight">{item.label.slice(0, 8)}</p>
                        <p className="text-xs mt-0.5" style={{ opacity: 0.8 }}>{formatNumber(item.participants)}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                  <div className="flex gap-1">
                    {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map(v => (
                      <div key={v} className="w-6 h-4 rounded" style={{ background: `rgba(27,78,107,${v})` }} />
                    ))}
                  </div>
                  <span>Az → Çok</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { FileText, Save, Download, RefreshCw, Users, Activity, Building2, TrendingUp, TrendingDown, Clock, CheckCircle, Edit } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { SessionUser } from '@/lib/authz'
import { CHART_CHROME, unitColor } from '@/lib/chart-colors'

interface Props {
  user: SessionUser
  periods: any[]
  units: any[]
  regions: any[]
  provinces: any[]
}

export default function HaftalikRaporClient({ user, periods, units, regions, provinces }: Props) {
  const [periodId, setPeriodId] = useState<string>(periods[0]?.id?.toString() || '')
  const [regionId, setRegionId] = useState<string>('')
  const [provinceId, setProvinceId] = useState<string>('')
  const [unitId, setUnitId] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    if (!periodId) return
    setIsLoading(true)
    try {
      let url = `/api/haftalik-rapor?periodId=${periodId}`
      if (provinceId) url += `&provinceId=${provinceId}`
      else if (regionId) url += `&regionId=${regionId}`
      
      if (unitId) url += `&unitId=${unitId}`


      const res = await fetch(url)
      if (!res.ok) throw new Error('Veri alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [periodId, regionId, provinceId, unitId])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!data || !data.period) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/haftalik-rapor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: data.period, data })
      })
      if (!res.ok) throw new Error('Kaydedilemedi')
      toast.success('Rapor arşive kaydedildi')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingActivity) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantCount: editingActivity.participants,
          note: editingActivity.note || '',
          location: '' // or whatever it had
        })
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      toast.success('Faaliyet güncellendi')
      setEditingActivity(null)
      loadData() // Yeniden yükle
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePdf = async () => {
    if (!printRef.current) return
    toast.loading('PDF hazırlanıyor...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: h2c } = await import('html2canvas')
      const canvas = await h2c(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      pdf.save(`GENC-IHH-Haftalik-Rapor-${data?.period?.weekNo}.pdf`)
      toast.dismiss(); toast.success('PDF indirildi!')
    } catch (e) {
      console.error(e)
      toast.dismiss(); toast.error('PDF oluşturulamadı')
    }
  }

  if (!periods.length) {
    return <div className="p-8 text-center text-slate-500">Dönem bulunamadı.</div>
  }

  const COLORS = ['#1B4E6B', '#16A34A', '#D97706', '#BE185D', '#2563EB', '#7C3AED']

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      {/* Başlık ve Filtre */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <FileText className="h-6 w-6" style={{ color: '#16A34A' }} />
            <span className="gradient-text">Haftalık Rapor</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Haftalık faaliyet durumunuzu inceleyin ve arşivleyin</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={periodId} onChange={e => setPeriodId(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none">
            {periods.map((p: any) => (
              <option key={p.id} value={p.id}>{p.year} - {p.weekNo}. Hafta</option>
            ))}
          </select>

          {(user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI') && (
            <select value={regionId} onChange={e => { setRegionId(e.target.value); setProvinceId('') }}
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none">
              <option value="">Tüm Bölgeler</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name} Bölge</option>)}
            </select>
          )}

          {(user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI' || user.role === 'BOLGE_KOORDINATOR') && (
            <select value={provinceId} onChange={e => setProvinceId(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none">
              <option value="">Tüm İller</option>
              {provinces
                .filter((p: any) => !regionId || p.regionId.toString() === regionId)
                .map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select value={unitId} onChange={e => setUnitId(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none">
            <option value="">Tüm Birimler</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <button onClick={() => loadData()} disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Yenile
          </button>
          <button onClick={handleSave} disabled={isSaving || !data}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-white" style={{ background: '#16A34A' }}>
            <Save className="h-4 w-4" /> {isSaving ? 'Kaydediliyor...' : 'Arşive Kaydet'}
          </button>
          <button onClick={handlePdf} disabled={!data}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-white" style={{ background: '#1B4E6B' }}>
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : data ? (
        <div ref={printRef} className="space-y-6 print-full p-4 bg-white">
          {/* Header */}
          <div className="border-b-2 pb-4 mb-4" style={{ borderColor: '#16A34A' }}>
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#0F1923' }}>GENÇ İHH — {data.scopeName}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {data.period.year} Yılı {data.period.weekNo}. Hafta Faaliyet Raporu
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Oluşturulma: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* KPI'lar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-avoid-break">
            {[
              { label: 'Toplam Katılımcı', value: data.totalParticipants, prev: data.prevTotalParticipants, icon: Users, color: '#1B4E6B' },
              { label: 'Faaliyet Sayısı', value: data.totalActivities, prev: data.prevTotalActivities, icon: Activity, color: '#16A34A' },
              { label: 'Farklı Kurum', value: data.institutionCount, icon: Building2, color: '#D97706' },
              { label: 'Kadın/Erkek', value: `${data.femaleParticipants} / ${data.maleParticipants}`, icon: Users, color: '#BE185D' },
            ].map((s: any) => {
              const change = s.prev ? ((s.value - s.prev) / (s.prev || 1) * 100) : null
              return (
                <div key={s.label} className="premium-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-medium text-slate-500">{s.label}</p>
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                    {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
                  </p>
                  {change !== null && (
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium" style={{ color: change >= 0 ? '#16A34A' : '#DC2626' }}>
                      {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(change).toFixed(1)}% (Önceki hafta)
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print-avoid-break">
            {/* Birim Kırılımı */}
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Birim Bazında Katılım</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byUnit} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_CHROME.tooltip} />
                  <Bar dataKey="participants" name="Katılımcı" radius={[0, 4, 4, 0]}>
                    {data.byUnit.map((u: any) => <Cell key={u.name} fill={unitColor(u.name)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Faaliyet Türü */}
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Faaliyet Türü Dağılımı</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.byActivityType} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => (percent || 0) > 0.05 ? `${name}` : ''} labelLine={false}>
                    {data.byActivityType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_CHROME.tooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kurum Detayları */}
          <div className="premium-card p-5 print-avoid-break">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Kurum Performansları (İlk 20)</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kurum</th>
                    <th>Birim</th>
                    <th>İl</th>
                    <th>Faaliyet Özeti</th>
                    <th className="text-right">Katılımcı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutions.slice(0, 20).map((inst: any) => (
                    <tr key={inst.id}>
                      <td className="font-medium text-slate-800">{inst.name}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ background: unitColor(inst.unitName) }} />
                          {inst.unitName}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">{inst.provinceName}</td>
                      <td className="text-xs text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {inst.activities.map((a: any) => (
                            <button
                              key={a.id}
                              onClick={() => setEditingActivity(a)}
                              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md text-slate-700 transition-colors border border-slate-200 group"
                              title="Düzenlemek için tıklayın"
                            >
                              <span>{a.type}:</span>
                              <span className="font-semibold">{a.participants}</span>
                              <Edit className="h-3 w-3 text-slate-400 group-hover:text-teal-600 transition-colors ml-1" />
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="text-right font-bold" style={{ color: '#1B4E6B' }}>
                        {formatNumber(inst.totalParticipants)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : null}

      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Faaliyet Düzenle</h3>
              <button onClick={() => setEditingActivity(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Faaliyet Türü</label>
                <input type="text" disabled value={editingActivity.type} className="w-full h-9 px-3 border rounded-lg text-sm bg-slate-50 text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Katılımcı Sayısı</label>
                <input required type="number" min="0" value={editingActivity.participants} onChange={e => setEditingActivity({...editingActivity, participants: e.target.value})} className="w-full h-9 px-3 border rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingActivity(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg disabled:opacity-50">
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Building2, Users, Activity, RefreshCw } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { SessionUser } from '@/lib/authz'
import { CHART_CHROME, unitColor } from '@/lib/chart-colors'

interface Props {
  user: SessionUser
  year: number
  provinces: any[]
}

const COLORS = ['#1B4E6B', '#16A34A', '#D97706', '#BE185D', '#2563EB', '#7C3AED']

export default function IlBirimClient({ user, year, provinces }: Props) {
  const [provinceId, setProvinceId] = useState<string>(provinces[0]?.id?.toString() || '')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(async (pid = provinceId) => {
    if (!pid) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/il-birim?year=${year}&provinceId=${pid}`)
      if (!res.ok) throw new Error('Veri alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [year, provinceId])

  useEffect(() => { loadData() }, [loadData])

  if (!provinces.length) {
    return <div className="p-8 text-center text-slate-500">Yetkili olduğunuz il bulunamadı.</div>
  }

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">
      {/* Başlık ve Filtre */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Building2 className="h-6 w-6" style={{ color: '#2563EB' }} />
            <span className="gradient-text">İl Birim Analizi — {year}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">İl bazında birim ve kurum performans kırılımları</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={provinceId} onChange={e => setProvinceId(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none">
            {provinces.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => loadData()} disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="premium-card p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-medium text-slate-500">Toplam Katılımcı</p>
                <Users className="h-4 w-4" style={{ color: '#1B4E6B' }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{formatNumber(data.totalParticipants)}</p>
            </div>
            <div className="premium-card p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-medium text-slate-500">Faaliyet Kaydı</p>
                <Activity className="h-4 w-4" style={{ color: '#16A34A' }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{formatNumber(data.totalActivities)}</p>
            </div>
            <div className="premium-card p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-medium text-slate-500">Aktif Kurum Sayısı</p>
                <Building2 className="h-4 w-4" style={{ color: '#D97706' }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{data.institutions.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Birim Kırılımı Tablosu */}
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Birim Kırılımı</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Birim</th>
                      <th className="text-right">Kurum</th>
                      <th className="text-right">Faaliyet</th>
                      <th className="text-right">Katılımcı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUnit.map((u: any) => (
                      <tr key={u.name}>
                        <td className="font-medium text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: unitColor(u.name) }} />
                            {u.name}
                          </span>
                        </td>
                        <td className="text-right text-slate-600">{u.institutions}</td>
                        <td className="text-right text-slate-600">{u.activities}</td>
                        <td className="text-right font-bold" style={{ color: '#1B4E6B' }}>{formatNumber(u.participants)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Faaliyet Türü Pasta */}
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

          {/* Kurum Tablosu */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Kurum Performansları (Tümü)</h3>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="data-table">
                <thead>
                  <tr className="sticky top-0 bg-white">
                    <th>Kurum</th>
                    <th>Birim</th>
                    <th>Faaliyet Detayları</th>
                    <th className="text-right">Toplam Katılımcı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutions.map((inst: any) => (
                    <tr key={inst.id}>
                      <td className="font-medium text-slate-800">{inst.name}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ background: unitColor(inst.unitName) }} />
                          {inst.unitName}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">
                        {Object.entries(inst.activities).map(([type, count]) => `${type}: ${count}`).join(' · ')}
                      </td>
                      <td className="text-right font-bold" style={{ color: '#1B4E6B' }}>
                        {formatNumber(inst.totalParticipants)}
                      </td>
                    </tr>
                  ))}
                  {data.institutions.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-slate-500 py-4">Kayıtlı faaliyet yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ClipboardList, Search, Loader2, ChevronLeft, ChevronRight,
  Users, RotateCcw, X, ExternalLink,
} from 'lucide-react'
import { unitColor, activityColor } from '@/lib/chart-colors'
import { formatNumber } from '@/lib/utils'

/**
 * Faaliyet Kayıtları — sistemdeki her toplamın indiği ham kayıt katmanı.
 * Panel/karne/karşılaştırma sayıları buraya filtreli link verir;
 * kullanıcı "bu 4 faaliyet neydi?" sorusunun cevabını tek tek görür.
 */

interface Props {
  provinces: { id: number; name: string }[]
  regions: { id: number; name: string }[]
  units: { id: number; name: string }[]
  activityTypes: { id: number; name: string }[]
  canFilterGender: boolean
  canFilterRegion: boolean
}

function FaaliyetlerInner({
  provinces, regions, units, activityTypes, canFilterGender, canFilterRegion,
}: Props) {
  const sp = useSearchParams()

  // Panel/karne linkleri URL parametreleriyle gelir — filtreler oradan açılır
  const [year, setYear] = useState(parseInt(sp.get('year') ?? String(new Date().getFullYear())))
  const [provinceId, setProvinceId] = useState(sp.get('provinceId') ?? '')
  const [regionId, setRegionId] = useState(sp.get('regionId') ?? '')
  const [unitId, setUnitId] = useState(sp.get('unitId') ?? '')
  const [activityTypeId, setActivityTypeId] = useState(sp.get('activityTypeId') ?? '')
  const [gender, setGender] = useState(sp.get('gender') ?? 'ALL')
  const [weekFrom, setWeekFrom] = useState(sp.get('weekFrom') ?? '')
  const [weekTo, setWeekTo] = useState(sp.get('weekTo') ?? '')
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [debouncedQ, setDebouncedQ] = useState(q)
  const [page, setPage] = useState(1)

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => { setPage(1) }, [year, provinceId, regionId, unitId, activityTypeId, gender, weekFrom, weekTo])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year), page: String(page), pageSize: '25' })
      if (provinceId) params.set('provinceId', provinceId)
      if (regionId) params.set('regionId', regionId)
      if (unitId) params.set('unitId', unitId)
      if (activityTypeId) params.set('activityTypeId', activityTypeId)
      if (gender !== 'ALL') params.set('gender', gender)
      if (weekFrom) params.set('weekFrom', weekFrom)
      if (weekTo) params.set('weekTo', weekTo)
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/activities?${params}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Kayıtlar alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [year, provinceId, regionId, unitId, activityTypeId, gender, weekFrom, weekTo, debouncedQ, page])

  useEffect(() => { load() }, [load])

  const hasFilters = !!(provinceId || regionId || unitId || activityTypeId || gender !== 'ALL' || weekFrom || weekTo || debouncedQ)
  const clearFilters = () => {
    setProvinceId(''); setRegionId(''); setUnitId(''); setActivityTypeId('')
    setGender('ALL'); setWeekFrom(''); setWeekTo(''); setQ(''); setDebouncedQ(''); setPage(1)
  }

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)
  const items = data?.items ?? []

  const selStyle = 'h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25'

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 gradient-text"
          style={{ fontFamily: 'Outfit, sans-serif' }}>
          <ClipboardList className="h-6 w-6" style={{ color: '#1B4E6B' }} />
          Faaliyet Kayıtları
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Sistemdeki her sayının kaynağı — kim, hangi hafta, hangi kurumda, kaç kişiyle. Genelden özele filtreleyin.
        </p>
      </div>

      {/* Filtre satırı */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Yıl</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={selStyle}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hafta</label>
          <div className="flex items-center gap-1">
            <select value={weekFrom} onChange={e => setWeekFrom(e.target.value)} className={selStyle}>
              <option value="">Baştan</option>
              {weeks.map(w => <option key={w} value={w}>{w}. hf</option>)}
            </select>
            <span className="text-xs text-slate-400">–</span>
            <select value={weekTo} onChange={e => setWeekTo(e.target.value)} className={selStyle}>
              <option value="">Sona</option>
              {weeks.map(w => <option key={w} value={w}>{w}. hf</option>)}
            </select>
          </div>
        </div>
        {canFilterRegion && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Bölge</label>
            <select value={regionId} onChange={e => setRegionId(e.target.value)} className={selStyle}>
              <option value="">Tüm bölgeler</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">İl</label>
          <select value={provinceId} onChange={e => setProvinceId(e.target.value)} className={selStyle}>
            <option value="">Tüm iller</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
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
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">Kurum ara</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Kurum adı…"
              className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-200 rounded-lg
                         focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none" />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <button onClick={clearFilters}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" /> Temizle
          </button>
        )}
      </div>

      {/* Toplam özeti — filtrelenen kümenin KPI'sı */}
      {data && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="premium-card px-4 py-2.5 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" style={{ color: '#1B4E6B' }} />
            <span className="text-sm"><strong className="tabular-nums">{formatNumber(data.total)}</strong> kayıt</span>
          </div>
          <div className="premium-card px-4 py-2.5 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: '#16A34A' }} />
            <span className="text-sm"><strong className="tabular-nums">{formatNumber(data.totalParticipants)}</strong> toplam katılımcı</span>
          </div>
          {data.pageCount > 1 && (
            <span className="text-xs text-slate-400">sayfa {data.page}/{data.pageCount}</span>
          )}
        </div>
      )}

      {/* Kayıt tablosu */}
      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
          <p className="text-sm text-slate-500">Kayıtlar yükleniyor…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">Bu filtrelerde kayıt yok</p>
          <p className="text-sm text-slate-400 mt-1">Filtreleri genişletin veya temizleyin.</p>
        </div>
      ) : (
        <div className={`premium-card overflow-hidden transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hafta</th>
                  <th>İl</th>
                  <th>Birim</th>
                  <th>Kurum</th>
                  <th>Detay</th>
                  <th>Faaliyet</th>
                  <th>Kol</th>
                  <th className="text-right">Katılımcı</th>
                  <th>Giren</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a: any) => (
                  <tr key={a.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap tabular-nums">{a.week}. hf</td>
                    <td>
                      <Link href={`/karne/${a.provinceId}`}
                        className="font-medium text-slate-800 hover:text-primary hover:underline underline-offset-2">
                        {a.provinceName}
                      </Link>
                      <span className="block text-xs text-slate-400">{a.regionName}</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: unitColor(a.unitName) }} />
                        {a.unitName}
                      </span>
                    </td>
                    <td className="text-sm text-slate-700 max-w-[220px] truncate" title={a.institutionName}>
                      {a.institutionName}
                    </td>
                    <td className="text-xs text-slate-500">
                      {a.facultyName ?? a.schoolType ?? '—'}
                    </td>
                    <td>
                      <span className="text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap"
                        style={{ background: activityColor(a.activityType) + '14', color: activityColor(a.activityType) }}>
                        {a.activityType}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{a.gender === 'K' ? 'Kadın' : 'Erkek'}</td>
                    <td className="text-right font-bold tabular-nums" style={{ color: '#1B4E6B' }}>
                      {formatNumber(a.participantCount)}
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{a.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sayfalama */}
      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Önceki
          </button>
          <span className="text-xs text-slate-500 px-2">{page} / {data.pageCount}</span>
          <button onClick={() => setPage(p => Math.min(data.pageCount, p + 1))} disabled={page >= data.pageCount}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
            Sonraki <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function FaaliyetlerClient(props: Props) {
  // useSearchParams Suspense sınırı ister
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#1B4E6B' }} />
      </div>
    }>
      <FaaliyetlerInner {...props} />
    </Suspense>
  )
}

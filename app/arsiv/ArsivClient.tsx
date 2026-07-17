'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Archive, Search, Loader2, RotateCcw, ArchiveRestore, ExternalLink,
  FileText, Bot, ChevronLeft, ChevronRight, X, Calendar, Filter,
} from 'lucide-react'
import { REPORT_TYPES, AI_TYPES, type ArchiveItem } from '@/lib/reports'
import { formatNumber } from '@/lib/utils'

interface Props {
  provinces: { id: number; name: string }[]
  regions: { id: number; name: string }[]
  years: number[]
}

const KINDS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'REPORT', label: 'Raporlar' },
  { key: 'AI', label: 'AI Analizleri' },
] as const

const STATUSES = [
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'ARCHIVED', label: 'Arşivlenenler' },
  { key: 'ALL', label: 'Hepsi' },
] as const

export default function ArsivClient({ provinces, regions, years }: Props) {
  const [kind, setKind] = useState<'ALL' | 'REPORT' | 'AI'>('ALL')
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE')
  const [type, setType] = useState('')
  const [scopeId, setScopeId] = useState('')
  const [regionId, setRegionId] = useState('')
  const [year, setYear] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<{ items: ArchiveItem[]; total: number; pageCount: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Aramayı geciktir — her tuşta istek atma
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ kind, status, page: String(page), pageSize: '12' })
      if (type) params.set('type', type)
      if (scopeId) params.set('scopeId', scopeId)
      if (regionId) params.set('regionId', regionId)
      if (year) params.set('year', year)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Arşiv alınamadı')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [kind, status, type, scopeId, regionId, year, from, to, debouncedQ, page])

  useEffect(() => { load() }, [load])

  // Filtre değişince ilk sayfaya dön
  useEffect(() => { setPage(1) }, [kind, status, type, scopeId, regionId, year, from, to])

  async function toggleArchive(item: ArchiveItem) {
    setBusyId(item.id)
    const action = item.isArchived ? 'restore' : 'archive'
    try {
      const res = await fetch(`/api/reports/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'İşlem başarısız')
      toast.success(action === 'archive' ? 'Arşive taşındı' : 'Geri yüklendi')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const typeOptions = useMemo(() => {
    if (kind === 'REPORT') return REPORT_TYPES.map(r => ({ value: r.key, label: r.label }))
    if (kind === 'AI') return Object.entries(AI_TYPES).map(([k, v]) => ({ value: k, label: v.label }))
    return [
      ...REPORT_TYPES.map(r => ({ value: r.key, label: `Rapor · ${r.label}` })),
      ...Object.entries(AI_TYPES).map(([k, v]) => ({ value: k, label: `AI · ${v.label}` })),
    ]
  }, [kind])

  const hasFilters = !!(type || scopeId || regionId || year || from || to || debouncedQ || status !== 'ACTIVE')

  function clearFilters() {
    setType(''); setScopeId(''); setRegionId(''); setYear(''); setFrom(''); setTo('')
    setQ(''); setDebouncedQ(''); setStatus('ACTIVE'); setPage(1)
  }

  const items = data?.items ?? []

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-4">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 gradient-text"
          style={{ fontFamily: 'Outfit, sans-serif' }}>
          <Archive className="h-6 w-6" style={{ color: '#1B4E6B' }} />
          Arşiv
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Üretilen her rapor, karne ve AI analizi burada kalıcı olarak saklanır — filtreleyin, arayın, yeniden açın.
        </p>
      </div>

      {/* Tür sekmeleri */}
      <div className="flex flex-wrap gap-2">
        {KINDS.map(k => (
          <button
            key={k.key}
            onClick={() => { setKind(k.key); setType('') }}
            className={`px-4 h-9 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
              kind === k.key
                ? 'text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            style={kind === k.key ? { background: '#1B4E6B' } : undefined}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Filtre satırı — hepsini kapsar, tek yerde */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-500">Ara</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Başlık, il veya analiz içeriği…"
              className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-200 rounded-lg
                         focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
            />
            {q && (
              <button onClick={() => setQ('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Tür</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm türler</option>
            {typeOptions.map((o, i) => <option key={`${o.value}-${i}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Bölge</label>
          <select value={regionId} onChange={e => setRegionId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm bölgeler</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">İl</label>
          <select value={scopeId} onChange={e => setScopeId(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm iller</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Yıl</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25">
            <option value="">Tüm yıllar</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Tarih aralığı
          </label>
          <div className="flex items-center gap-1">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25" />
            <span className="text-xs text-slate-400">–</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/25" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Durum</label>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => setStatus(s.key)}
                className="px-2.5 h-8 text-xs font-medium transition-all"
                style={{
                  background: status === s.key ? '#1B4E6B' : '#fff',
                  color: status === s.key ? '#fff' : '#64748b',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white
                       hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <RotateCcw className="h-3 w-3" /> Temizle
          </button>
        )}
      </div>

      {/* Sonuç sayısı */}
      {data && (
        <p className="text-xs text-slate-400">
          {isLoading ? 'Yükleniyor…' : `${formatNumber(data.total)} kayıt bulundu`}
          {data.pageCount > 1 && ` · sayfa ${page}/${data.pageCount}`}
        </p>
      )}

      {/* Liste */}
      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
          <p className="text-sm text-slate-500">Arşiv yükleniyor…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">
            {hasFilters ? 'Bu filtrelerde kayıt yok' : 'Arşiv henüz boş'}
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {hasFilters
              ? 'Filtreleri değiştirin veya temizleyin.'
              : 'Karne sayfasından bir karne kaydettiğinizde veya AI analizi ürettiğinizde burada görünür.'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters}
              className="mt-4 h-9 px-4 rounded-lg text-xs font-medium text-white" style={{ background: '#1B4E6B' }}>
              Filtreleri temizle
            </button>
          ) : (
            <Link href="/karne"
              className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-lg text-xs font-medium text-white"
              style={{ background: '#1B4E6B' }}>
              Karne sayfasına git <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          {items.map(item => (
            <div key={item.id}
              className={`premium-card p-4 flex flex-col gap-3 ${item.isArchived ? 'opacity-70' : ''}`}
              style={{ borderLeft: `3px solid ${item.color}` }}>

              {/* Üst: tür + tarih */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: item.bg }}>
                    {item.kind === 'AI'
                      ? <Bot className="h-3.5 w-3.5" style={{ color: item.color }} />
                      : <FileText className="h-3.5 w-3.5" style={{ color: item.color }} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: item.bg, color: item.color }}>
                      {item.typeLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">
                    {new Date(item.generatedAt).toLocaleDateString('tr-TR')}
                  </p>
                  {item.isArchived && (
                    <span className="text-xs text-amber-600 font-medium">Arşivde</span>
                  )}
                </div>
              </div>

              {/* Başlık */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.scopeName ?? 'Türkiye'}
                  {item.year ? ` · ${item.year}` : ''}
                  {' · '}{item.generatedByName}
                </p>
              </div>

              {/* Karne özeti — tam raporu açmadan KPI */}
              {item.summary && (
                <div className="flex flex-wrap items-center gap-2">
                  {item.summary.grade && (
                    <span className="text-xs font-bold px-2 py-1 rounded-md"
                      style={{ background: item.bg, color: item.summary.gradeColor ?? item.color }}>
                      {item.summary.grade} · {item.summary.total}/100
                    </span>
                  )}
                  {item.summary.rank && (
                    <span className="text-xs text-slate-500">
                      Sıra <strong className="text-slate-700">{item.summary.rank}/{item.summary.nationalCount}</strong>
                    </span>
                  )}
                  {item.summary.totalParticipants != null && (
                    <span className="text-xs text-slate-500">
                      <strong className="text-slate-700">{formatNumber(item.summary.totalParticipants)}</strong> katılımcı
                    </span>
                  )}
                </div>
              )}

              {/* AI analiz önizlemesi */}
              {item.excerpt && (
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.excerpt}…</p>
              )}

              {/* Aksiyonlar */}
              <div className="flex items-center gap-2 mt-auto pt-1">
                <Link href={`/arsiv/${item.id}`}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all
                             hover:shadow-sm active:scale-95"
                  style={{ background: item.bg, color: item.color }}>
                  <ExternalLink className="h-3 w-3" /> Aç
                </Link>
                <button
                  onClick={() => toggleArchive(item)}
                  disabled={busyId === item.id}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border
                             border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {busyId === item.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : item.isArchived
                      ? <ArchiveRestore className="h-3 w-3" />
                      : <Archive className="h-3 w-3" />}
                  {item.isArchived ? 'Geri yükle' : 'Arşivle'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sayfalama */}
      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white
                       hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Önceki
          </button>
          <span className="text-xs text-slate-500 px-2">
            {page} / {data.pageCount}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pageCount, p + 1))}
            disabled={page >= data.pageCount}
            className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white
                       hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Sonraki <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

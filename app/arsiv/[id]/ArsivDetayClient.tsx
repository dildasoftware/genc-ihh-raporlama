'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft, Printer, Loader2, Archive, ArchiveRestore, Bot, FileText, Download,
  Users, Building2, CalendarCheck, BarChart3, Clock, User as UserIcon, ExternalLink,
} from 'lucide-react'
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie
} from 'recharts'
import { DIMENSIONS } from '@/lib/karne'
import { unitColor, CHART_CHROME } from '@/lib/chart-colors'
import { formatNumber } from '@/lib/utils'

/**
 * Arşivlenmiş kaydı yeniden açar.
 *
 * Rapor: snapshotJson'dan birebir render edilir — kaydedildiği andaki hâli.
 * Canlı veriden DEĞİL, snapshot'tan okur; böylece geçmiş rapor sonradan
 * değişmez ve tarihsel kayıt olarak güvenilir kalır.
 */
export default function ArsivDetayClient({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Kayıt açılamadı')
        return r.json()
      })
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setIsLoading(false))
  }, [id])

  async function toggleArchive() {
    setIsBusy(true)
    const action = data.isArchived ? 'restore' : 'archive'
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'İşlem başarısız')
      const json = await res.json()
      setData((d: any) => ({ ...d, isArchived: json.isArchived }))
      toast.success(action === 'archive' ? 'Arşive taşındı' : 'Geri yüklendi')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsBusy(false)
    }
  }

  // PDF = tarayıcının native print'i. html2canvas KULLANILMAZ:
  // 1.4.1 yalnız rgb/rgba/hsl/hsla ayrıştırır, Tailwind v4 slate paletini
  // lab() olarak yayar → "unsupported color function lab" ile patlar.
  // Print CSS altyapısı globals.css'te hazır (print-full/print-only/no-print).
  const handlePdf = () => window.print()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: '#0E7A3C' }} />
        <p className="text-sm text-slate-500">Kayıt açılıyor…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-5 max-w-4xl mx-auto">
        <Link href="/arsiv" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Arşive dön
        </Link>
        <div className="premium-card p-12 text-center">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-slate-600 font-medium">Kayıt bulunamadı veya yetkiniz yok</p>
        </div>
      </div>
    )
  }

  const snap = data.snapshot
  const isKarne = data.kind === 'REPORT' && snap?.karne
  const isHaftalik = data.kind === 'REPORT' && snap && !snap.karne && snap.totalParticipants !== undefined

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4 print-full">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <Link href="/arsiv" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Arşive dön
        </Link>
        <div className="flex items-center gap-2">
          {data.scopeType === 'PROVINCE' && data.scopeId && (
            <Link href={`/karne/${data.scopeId}`}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-slate-200
                         bg-white hover:bg-slate-50 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Güncel karneyi aç
            </Link>
          )}
          <button onClick={toggleArchive} disabled={isBusy}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-slate-200
                       bg-white hover:bg-slate-50 transition-colors disabled:opacity-50">
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : data.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {data.isArchived ? 'Geri yükle' : 'Arşivle'}
          </button>
          <button onClick={handlePdf}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
            style={{ background: '#0E7A3C' }}>
            <Download className="h-4 w-4" /> PDF olarak indir
          </button>
        </div>
      </div>

      {/* Arşiv uyarısı */}
      {data.isArchived && (
        <div className="rounded-xl p-3 flex items-center gap-2 no-print" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <Archive className="h-4 w-4 shrink-0" style={{ color: '#D97706' }} />
          <p className="text-xs" style={{ color: '#92400E' }}>
            Bu kayıt arşivde. Listede varsayılan olarak görünmez ama silinmedi — istediğinizde geri yükleyebilirsiniz.
          </p>
        </div>
      )}

      {/* Rapor İçeriği */}
      <div ref={printRef} className="space-y-4 print-full bg-white p-4">
      {/* Yazdırma başlığı */}
      <div className="print-only mb-4 pb-3 border-b-2" style={{ borderColor: '#0E7A3C' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0E7A3C, #16A34A)' }}>
            <span className="text-white font-bold">Gİ</span>
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#0A1F14' }}>GENÇ İHH — {data.typeLabel}</h1>
            <p className="text-xs text-slate-500">{data.title}</p>
          </div>
        </div>
      </div>

      {/* Kayıt künyesi */}
      <div className="premium-card p-5 print-avoid-break" style={{ borderLeft: `3px solid ${data.color}` }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: data.bg }}>
            {data.kind === 'AI'
              ? <Bot className="h-5 w-5" style={{ color: data.color }} />
              : <FileText className="h-5 w-5" style={{ color: data.color }} />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: data.bg, color: data.color }}>
              {data.typeLabel}
            </span>
            <h2 className="text-lg font-bold text-slate-800 mt-1.5">{data.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(data.generatedAt).toLocaleString('tr-TR')}
              </span>
              <span className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> {data.generatedByName}
              </span>
              {data.scopeName && <span>Kapsam: <strong className="text-slate-700">{data.scopeName}</strong></span>}
              {data.year && <span>Yıl: <strong className="text-slate-700">{data.year}</strong></span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI analizi ── */}
      {data.kind === 'AI' && (
        <div className="premium-card p-5 print-avoid-break">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4" style={{ color: data.color }} /> AI Analizi
          </h3>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed
                          prose-headings:text-slate-800 prose-strong:text-slate-800">
            <ReactMarkdown>{data.response}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── Karne snapshot'ı ── */}
      {isKarne && (() => {
        const k = snap.karne
        const grade = k.grade
        const radarData = DIMENSIONS.map((d: any) => ({ boyut: d.label, puan: Math.round(k.scores[d.key]) }))
        const unitBars = Object.entries(k.byUnit as Record<string, any>)
          .map(([name, v]) => ({ name, katılımcı: v.participants, kurum: v.institutionCount }))
          .sort((a, b) => b.katılımcı - a.katılımcı)

        return (
          <>
            {/* Hero */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-avoid-break">
              <div className="premium-card p-5 text-center"
                style={{ background: grade.bg, borderColor: grade.color + '40' }}>
                <p className="text-5xl font-bold leading-none" style={{ color: grade.color }}>{grade.letter}</p>
                <p className="text-xs font-semibold mt-2" style={{ color: grade.color }}>{grade.label}</p>
                <p className="text-xs text-slate-500 mt-1">{k.total} / 100 puan</p>
              </div>
              <div className="premium-card p-5 text-center flex flex-col justify-center"
                style={{ background: 'linear-gradient(135deg, #0E7A3C, #16A34A)' }}>
                <p className="text-2xl font-bold text-white leading-tight">
                  {(snap.province?.name ?? data.scopeName ?? '').toLocaleUpperCase('tr')}
                </p>
                <p className="text-xs text-white/70 mt-1">{snap.province?.regionName}</p>
              </div>
              <div className="premium-card p-5 text-center">
                <p className="text-4xl font-bold leading-none" style={{ color: '#0E7A3C' }}>
                  {k.rank}<span className="text-lg text-slate-300">/{snap.nationalCount}</span>
                </p>
                <p className="text-xs text-slate-500 mt-2">Türkiye sıralaması</p>
              </div>
              <div className="premium-card p-5 text-center">
                <p className="text-4xl font-bold leading-none" style={{ color: '#16A34A' }}>
                  {snap.regionRank ?? '—'}<span className="text-lg text-slate-300">/{snap.regionCount}</span>
                </p>
                <p className="text-xs text-slate-500 mt-2">{snap.province?.regionName} sıralaması</p>
              </div>
            </div>

            {/* Göstergeler */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-avoid-break">
              {[
                { icon: Users, label: 'Toplam katılımcı', value: formatNumber(k.totalParticipants), color: '#16A34A' },
                { icon: Building2, label: 'Farklı kurum', value: k.institutionCount, color: '#2563EB' },
                { icon: BarChart3, label: 'Faaliyet kaydı', value: formatNumber(k.totalActivities), color: '#D97706' },
                { icon: CalendarCheck, label: 'Aktif hafta', value: `${k.activeWeeks}/${k.totalWeeks}`, color: '#BE185D' },
              ].map((s: any) => (
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

            {/* Tespitler */}
            {k.insights?.length > 0 && (
              <div className="premium-card p-5 print-avoid-break">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Karne Değerlendirmesi</h3>
                <div className="space-y-2">
                  {k.insights.map((ins: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                      style={{ background: ins.kind === 'güçlü' ? '#F0FDF4' : ins.kind === 'zayıf' ? '#FEF2F2' : '#F8FAFC' }}>
                      <p className="text-sm text-slate-700">{ins.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profil + birim */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="premium-card p-5 print-avoid-break">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Karne Profili</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke={CHART_CHROME.grid} />
                    <PolarAngleAxis dataKey="boyut" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Radar dataKey="puan" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip formatter={(v: any) => [`${v} / 100`, 'Puan']} contentStyle={CHART_CHROME.tooltip} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="premium-card p-5 print-avoid-break">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Boyut Puanları</h3>
                <div className="space-y-3">
                  {DIMENSIONS.map((d: any) => (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">
                          {d.label} <span className="text-slate-400">(%{d.weight})</span>
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>
                          {Math.round(k.scores[d.key])}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                        <div className="h-full rounded-full" style={{ width: `${k.scores[d.key]}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Birim dağılımı */}
            {unitBars.length > 0 && (
              <div className="premium-card p-5 print-avoid-break">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Birim Bazında Katılım</h3>
                <ResponsiveContainer width="100%" height={Math.max(140, unitBars.length * 44 + 20)}>
                  <BarChart data={unitBars} layout="vertical" margin={{ left: 0, right: 48, top: 4, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
                    <XAxis type="number" tick={CHART_CHROME.tick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={CHART_CHROME.tick} width={84} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={CHART_CHROME.tooltip}
                      formatter={(v: any, _n: any, p: any) => [`${formatNumber(v)} kişi · ${p.payload.kurum} kurum`, p.payload.name]} />
                    <Bar dataKey="katılımcı" radius={CHART_CHROME.barRadius} barSize={18}>
                      {unitBars.map((u: any) => <Cell key={u.name} fill={unitColor(u.name)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Kurum kırılımı */}
            {snap.institutions?.length > 0 && (
              <div className="premium-card p-5 print-avoid-break print-break-before">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Kurum Kırılımı</h3>
                <p className="text-xs text-slate-400 mb-3">Raporun kaydedildiği andaki hâli</p>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Kurum</th><th>Birim</th><th>Çalışmalar</th><th className="text-right">Toplam</th></tr>
                    </thead>
                    <tbody>
                      {snap.institutions.map((inst: any) => (
                        <tr key={`${inst.unitName}-${inst.name}`}>
                          <td className="font-medium text-slate-800">{inst.name}</td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ background: unitColor(inst.unitName) }} />
                              {inst.unitName}
                            </span>
                          </td>
                          <td className="text-xs text-slate-600">
                            {inst.activities.map((a: any) => `${a.type}: ${formatNumber(a.participants)}`).join(' · ')}
                          </td>
                          <td className="text-right font-bold tabular-nums" style={{ color: '#0E7A3C' }}>
                            {formatNumber(inst.totalParticipants)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* ── Haftalık Rapor snapshot'ı ── */}
      {isHaftalik && (() => {
        const change = snap.prevTotalParticipants ? ((snap.totalParticipants - snap.prevTotalParticipants) / snap.prevTotalParticipants * 100) : null
        const COLORS = ['#2563EB', '#16A34A', '#D97706', '#BE185D', '#0891B2', '#7C3AED']

        return (
          <>
            {/* KPI'lar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-avoid-break">
              {[
                { label: 'Toplam Katılımcı', value: snap.totalParticipants, prev: snap.prevTotalParticipants, icon: Users, color: '#0E7A3C' },
                { label: 'Faaliyet Sayısı', value: snap.totalActivities, prev: snap.prevTotalActivities, icon: BarChart3, color: '#16A34A' },
                { label: 'Farklı Kurum', value: snap.institutionCount, icon: Building2, color: '#D97706' },
                { label: 'Kadın/Erkek', value: `${snap.femaleParticipants ?? '?'} / ${snap.maleParticipants ?? '?'}`, icon: Users, color: '#BE185D' },
              ].map((s: any) => {
                const perc = s.prev ? ((s.value as number - s.prev) / (s.prev || 1) * 100) : null
                return (
                  <div key={s.label} className="premium-card p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-medium text-slate-500">{s.label}</p>
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                        {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
                      </p>
                      {perc !== null && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-medium" style={{ color: perc >= 0 ? '#16A34A' : '#DC2626' }}>
                          {perc >= 0 ? '▲' : '▼'} {Math.abs(perc).toFixed(1)}%
                        </div>
                      )}
                    </div>
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
                  <BarChart data={snap.byUnit} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid horizontal={false} stroke={CHART_CHROME.grid} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_CHROME.tooltip} />
                    <Bar dataKey="participants" name="Katılımcı" radius={[0, 4, 4, 0]}>
                      {snap.byUnit?.map((u: any) => <Cell key={u.name} fill={unitColor(u.name)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Faaliyet Türü */}
              <div className="premium-card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Faaliyet Türü Dağılımı</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={snap.byActivityType} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => (percent || 0) > 0.05 ? `${name}` : ''} labelLine={false}>
                      {snap.byActivityType?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_CHROME.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kurum Detayları */}
            {snap.institutions && snap.institutions.length > 0 && (
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
                      {snap.institutions?.slice(0, 20).map((inst: any) => (
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
                              {inst.activities?.map((a: any) => (
                                <span key={a.id} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-slate-700">
                                  <span>{a.type}:</span>
                                  <span className="font-semibold">{a.participants}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-right font-bold" style={{ color: '#0E7A3C' }}>
                            {formatNumber(inst.totalParticipants)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )
      })()}

      <p className="print-only text-xs text-slate-400 text-center pt-3 border-t border-slate-200">
        GENÇ İHH Raporlama Sistemi · {data.title} · Arşiv kaydı ·{' '}
        {new Date(data.generatedAt).toLocaleDateString('tr-TR')}
      </p>
      </div>
    </div>
  )
}

'use client'

import { useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Award, Download, Bot, CheckCircle2, XCircle, MapPin, Users,
  Building2, ArrowLeft, Target
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'

const UNIT_COLORS: Record<string, string> = {
  'Üniversite': '#1B4E6B',
  'Lise': '#16A34A',
  'Ortaokul': '#D97706',
  'Çocuk': '#BE185D',
  'Aktif Gençlik': '#7C3AED',
  'Atom': '#0891B2',
}

const ORG_LABELS: { key: string; label: string }[] = [
  { key: 'ilBaskani', label: 'İl Başkanı' },
  { key: 'teskilatBsk', label: 'Teşkilat Bşk.' },
  { key: 'egitimBsk', label: 'Eğitim Bşk.' },
  { key: 'universiteBsk', label: 'Üniversite Bşk.' },
  { key: 'liseBsk', label: 'Lise Bşk.' },
  { key: 'ortaokulBsk', label: 'Ortaokul Bşk.' },
  { key: 'ihhCocukBsk', label: 'İHH Çocuk Bşk.' },
  { key: 'tanitimMedya', label: 'Tanıtım Medya' },
  { key: 'projeFonBsk', label: 'Proje Fon Bşk.' },
  { key: 'sosyalFaal', label: 'Sosyal Faal.' },
  { key: 'atomBsk', label: 'ATOM Bşk.' },
  { key: 'aktifGenclik', label: 'Aktif Gençlik' },
]

interface Props {
  province: any
  report: any
  unitStats: Record<string, { count: number; participants: number; score: number }>
  year: number
}

export default function KarneDetayClient({ province, report, unitStats, year }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const orgStatus = (report?.orgStatus || {}) as Record<string, boolean>
  const targets = (report?.targets || {}) as Record<string, number>

  // PDF İndir
  const handlePdf = useCallback(async () => {
    const jspdf = await import('jspdf')
    const html2canvas = await import('html2canvas')
    if (!printRef.current) return
    toast.loading('PDF hazırlanıyor...')
    try {
      const canvas = await html2canvas.default(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jspdf.default({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`GENC-IHH-Karne-${province.name}-${year}.pdf`)
      toast.dismiss()
      toast.success('PDF indirildi!')
    } catch (e: any) {
      toast.dismiss()
      toast.error('PDF hatası: ' + e.message)
    }
  }, [province.name, year])

  // Birim Puanları chart data
  const birimData = Object.entries(unitStats)
    .filter(([, v]) => v.count > 0 || v.participants > 0)
    .map(([name, v]) => ({
      name,
      puan: Math.round(v.score),
      katilimci: v.participants,
      faaliyet: v.count,
    }))

  // İlçe chart data
  const ilceData = [
    { name: 'İHH İlçe', value: report?.ihhDistrictCount || 0, fill: '#1B4E6B' },
    { name: 'Genç İHH', value: report?.gencIhhDistrictCount || 0, fill: '#16A34A' },
    {
      name: 'Diğer İlçe',
      value: Math.max(0, (report?.totalDistrictCount || 0) - (report?.ihhDistrictCount || 0)),
      fill: '#E2E8F0',
    },
  ].filter(d => d.value > 0)

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      {/* Üst bar */}
      <div className="flex items-center justify-between no-print">
        <Link href="/karne" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Tüm İller
        </Link>
        <div className="flex gap-2">
          <button onClick={handlePdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#1B4E6B', color: '#fff' }}>
            <Download className="h-4 w-4" /> PDF İndir
          </button>
        </div>
      </div>

      {/* ── KARNENİN KENDİSİ ── */}
      <div ref={printRef} className="space-y-5">
        {/* Header: Sıra + İl + Puan */}
        <div className="grid grid-cols-3 gap-4">
          {/* Sıralama */}
          <div className="premium-card p-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
            <div className="text-center text-white">
              <p className="text-5xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {report?.ranking || '—'}
              </p>
              <p className="text-sm opacity-80 mt-1">Sıralama</p>
            </div>
          </div>

          {/* İl Adı */}
          <div className="premium-card p-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #16A34A, #22c55e)' }}>
            <div className="text-center text-white">
              <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {province.name.toUpperCase()}
              </p>
              <p className="text-sm opacity-80 mt-1">{province.region?.name}</p>
            </div>
          </div>

          {/* Puan */}
          <div className="premium-card p-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #BE185D, #E11D48)' }}>
            <div className="text-center text-white">
              <p className="text-xs uppercase tracking-wider opacity-80">PUAN</p>
              <p className="text-5xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {report?.totalScore?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Üç kolon: İl Genel + Teşkilat + Hedefler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* İl Genel Verileri */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: '#1B4E6B' }} />
              İl Genel Verileri
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Nüfus', value: report?.population },
                { label: 'İlçe Sayısı', value: report?.districtCount },
                { label: 'Öğrenci Sayısı', value: report?.studentCount },
                { label: 'Üniversite Sayısı', value: report?.universityCount },
                { label: 'Lise Sayısı', value: report?.highSchoolCount },
                { label: 'Ortaokul Sayısı', value: report?.middleSchoolCount },
                { label: 'İlkokul Sayısı KYK', value: report?.kykCount },
                { label: 'Yurdu Sayısı', value: report?.dormCount },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {item.value ? formatNumber(item.value) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Teşkilat Durumu */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: '#16A34A' }} />
              Teşkilat Durumu
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ORG_LABELS.map(pos => {
                const active = orgStatus[pos.key]
                return (
                  <div key={pos.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium ${
                    active
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50/50 text-red-400 border border-red-100'
                  }`}>
                    {active
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-red-300 shrink-0" />}
                    <span className="truncate">{pos.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dönem Hedefleri */}
          <div className="premium-card p-5" style={{ background: '#FFF7ED', borderColor: '#FDBA74' }}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: '#D97706' }} />
              {year}-{year + 1} Dönem Hedefleri
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Teşkilat Hedefi', value: targets.teskilatHedefi },
                { label: 'İlçe Hedefi', value: targets.ilceHedefi },
                { label: 'Fakülte Başkanı Hedefi', value: targets.fakulteBaskanHedefi },
                { label: 'Lise Temsilci Hedefi', value: targets.liseTemsilciHedefi },
                { label: 'Fon Hedefi', value: targets.fonHedefi ? `${formatNumber(targets.fonHedefi)} TL` : null },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-amber-100 last:border-0">
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: '#D97706' }}>
                    {item.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grafikler: Birim Puanları + İlçe Çalışmaları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Birim Puanları — Horizontal Bar */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: '#1B4E6B' }} />
              Birim Puanları
            </h3>
            {birimData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={birimData} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      (v as number).toLocaleString('tr-TR'),
                      name === 'puan' ? 'Puan' : name === 'katilimci' ? 'Katılımcı' : 'Faaliyet',
                    ]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="puan" name="Puan" radius={[0, 8, 8, 0]}>
                    {birimData.map((entry, i) => (
                      <Cell key={i} fill={UNIT_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Henüz birim verisi yok</p>
              </div>
            )}
          </div>

          {/* İlçe Çalışmaları — Pie Chart */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: '#D97706' }} />
              İlçe Çalışmaları
            </h3>
            {ilceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={ilceData}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {ilceData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [v, 'İlçe']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value: string) => <span className="text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">İlde Kaç İlçe Var?</span>
                    <span className="font-bold text-slate-700">{report?.totalDistrictCount || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">İHH Kaç İlçede Var?</span>
                    <span className="font-bold text-slate-700">{report?.ihhDistrictCount || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Genç İHH Hanımlar Kaç İlçede?</span>
                    <span className="font-bold" style={{ color: '#16A34A' }}>{report?.gencIhhDistrictCount || '—'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Henüz ilçe verisi yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Detaylı Kurum Verileri */}
        {report?.universityData && (report.universityData as any[]).length > 0 && (
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: '#1B4E6B' }} />
              Üniversite Detayları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(report.universityData as any[]).map((uni: any, i: number) => (
                <div key={i} className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                  <p className="font-semibold text-sm text-slate-700 mb-2">{uni.name}</p>
                  <div className="space-y-1">
                    {(uni.activities || []).map((act: any, j: number) => (
                      <div key={j} className="flex justify-between text-xs">
                        <span className="text-slate-500">{act.type}</span>
                        <span className="font-medium text-slate-700">
                          {act.locationCount > 0 && `${act.locationCount} lokasyon · `}
                          {act.participantCount} kişi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.highSchoolData && (report.highSchoolData as any[]).length > 0 && (
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: '#16A34A' }} />
              Lise Detayları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(report.highSchoolData as any[]).map((school: any, i: number) => (
                <div key={i} className="bg-green-50/50 rounded-xl p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-sm text-slate-700">{school.name}</p>
                    {school.schoolType && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">{school.schoolType}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {(school.activities || []).map((act: any, j: number) => (
                      <div key={j} className="flex justify-between text-xs">
                        <span className="text-slate-500">{act.type}</span>
                        <span className="font-medium text-slate-700">{act.participantCount} kişi</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

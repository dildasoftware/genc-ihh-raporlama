import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter, getRoleLabel, getGenderLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { formatNumber, calcChangePercent, formatDate } from '@/lib/utils'
import { Activity, Users, TrendingUp, MapPin, Award, ArrowUp, ArrowDown, Minus, AlertCircle, BarChart3, Building2 } from 'lucide-react'
import Link from 'next/link'
import { WeeklyTrendChart, UnitPieChart } from '@/components/shared/DashboardCharts'

export const dynamic = 'force-dynamic'

export default async function PanelPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user: SessionUser = {
    id: (session.user as any).id,
    role: (session.user as any).role,
    genderBranch: (session.user as any).genderBranch,
    provinceId: (session.user as any).provinceId,
    regionId: (session.user as any).regionId,
    unitId: (session.user as any).unitId,
    fullName: session.user.name ?? '',
  }

  const now = new Date()
  const currentPeriod = await prisma.period.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: 'desc' },
  }) ?? await prisma.period.findFirst({ orderBy: { startDate: 'desc' } })

  const lastPeriod = currentPeriod
    ? await prisma.period.findFirst({ where: { id: { lt: currentPeriod.id } }, orderBy: { startDate: 'desc' } })
    : null

  const currentFilter = buildActivityFilter(user)

  const [currentCount, lastCount, totalAgg, totalAllTime] = await Promise.all([
    currentPeriod ? prisma.activity.count({ where: { ...currentFilter, periodId: currentPeriod.id } }) : Promise.resolve(0),
    lastPeriod ? prisma.activity.count({ where: { ...currentFilter, periodId: lastPeriod.id } }) : Promise.resolve(0),
    currentPeriod
      ? prisma.activity.aggregate({ where: { ...currentFilter, periodId: currentPeriod.id }, _sum: { participantCount: true } })
      : Promise.resolve({ _sum: { participantCount: 0 } }),
    prisma.activity.aggregate({ where: currentFilter, _sum: { participantCount: true } }),
  ])

  const changePercent = calcChangePercent(currentCount, lastCount)
  const participantsThisWeek = totalAgg._sum.participantCount ?? 0
  const participantsAllTime = totalAllTime._sum.participantCount ?? 0

  // Son 8 hafta trendi
  const last8Periods = await prisma.period.findMany({
    orderBy: { weekNo: 'desc' }, take: 8,
    where: { year: currentPeriod?.year ?? now.getFullYear() },
  })
  const weeklyData = await Promise.all(
    last8Periods.map(async p => {
      const [count, agg] = await Promise.all([
        prisma.activity.count({ where: { ...currentFilter, periodId: p.id } }),
        prisma.activity.aggregate({ where: { ...currentFilter, periodId: p.id }, _sum: { participantCount: true } }),
      ])
      return { weekNo: p.weekNo, count, participants: agg._sum.participantCount ?? 0 }
    })
  )
  weeklyData.reverse()

  // Bölge bazında veri girmeyen iller (BOLGE_KOORDINATOR)
  const emptyProvinces = user.role === 'BOLGE_KOORDINATOR' && currentPeriod
    ? await prisma.province.findMany({
        where: {
          regionId: user.regionId!,
          institutions: { none: { activities: { some: { periodId: currentPeriod.id, deletedAt: null } } } },
        },
        select: { name: true },
      })
    : []

  // Top 5 il (BOLGE + MERKEZ + ADMIN)
  const canSeeRanking = user.role !== 'IL_KOORDINATOR'
  const topActivities = canSeeRanking && currentPeriod
    ? await prisma.activity.findMany({
        where: { ...currentFilter, periodId: currentPeriod.id },
        include: { institution: { include: { province: true, unit: true } } },
        take: 200,
      })
    : []

  const byProvince: Record<string, { name: string; id: number | null; count: number; participants: number }> = {}
  for (const a of topActivities) {
    const key = a.institution.province?.name ?? 'Bilinmiyor'
    if (!byProvince[key]) byProvince[key] = { name: key, id: a.institution.provinceId ?? null, count: 0, participants: 0 }
    byProvince[key].count++
    byProvince[key].participants += a.participantCount
  }
  const top5 = Object.values(byProvince).sort((a, b) => b.participants - a.participants).slice(0, 5)
  const maxParticipants = top5[0]?.participants || 1

  // Birim dağılımı
  const byUnit: Record<string, { name: string; id: number | null; count: number; participants: number }> = {}
  for (const a of topActivities) {
    const key = a.institution.unit?.name ?? 'Diğer'
    if (!byUnit[key]) byUnit[key] = { name: key, id: a.institution.unitId ?? null, count: 0, participants: 0 }
    byUnit[key].count++
    byUnit[key].participants += a.participantCount
  }
  const unitData = Object.values(byUnit).sort((a, b) => b.count - a.count)
  const maxUnitCount = unitData[0]?.count || 1

  const unitColors = ['#2563EB', '#16A34A', '#D97706', '#BE185D', '#7C3AED']


  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* ── Başlık ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="gradient-text">Panel</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Hoş geldiniz, <strong className="text-slate-700">{user.fullName}</strong>
            {currentPeriod && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-100">
                Aktif: {currentPeriod.year} / Hafta {currentPeriod.weekNo}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: '#EFF8FF', color: '#0E7A3C', border: '1px solid #BFDBFE' }}>
            {getRoleLabel(user.role)}
          </span>
          {user.genderBranch && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: user.genderBranch === 'K' ? '#FDF2F8' : '#EFF6FF',
                color: user.genderBranch === 'K' ? '#BE185D' : '#1D4ED8',
                border: `1px solid ${user.genderBranch === 'K' ? '#FBCFE8' : '#BFDBFE'}`,
              }}>
              {getGenderLabel(user.genderBranch)}
            </span>
          )}
        </div>
      </div>

      {/* ── KPI Kartları — hepsi kaynak kayıtlara iner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {/* Bu Hafta Faaliyet */}
        <Link
          href={currentPeriod
            ? `/faaliyetler?year=${currentPeriod.year}&weekFrom=${currentPeriod.weekNo}&weekTo=${currentPeriod.weekNo}`
            : '/faaliyetler'}
          className="premium-card p-4 animate-fade-in-up block group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500">Bu Hafta Faaliyet</p>
            <Activity className="h-4 w-4" style={{ color: '#0E7A3C' }} />
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>
            {formatNumber(currentCount)}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            {changePercent > 0 ? (
              <><ArrowUp className="h-3 w-3 text-green-500" /><span className="text-xs text-green-600 font-medium">+{changePercent.toFixed(1)}%</span></>
            ) : changePercent < 0 ? (
              <><ArrowDown className="h-3 w-3 text-red-500" /><span className="text-xs text-red-600 font-medium">{changePercent.toFixed(1)}%</span></>
            ) : (
              <><Minus className="h-3 w-3 text-slate-400" /><span className="text-xs text-slate-400">Değişim yok</span></>
            )}
            <span className="text-xs text-slate-400 ml-1">geçen haftaya göre</span>
          </div>
          <p className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#0E7A3C' }}>
            Kayıtları gör →
          </p>
        </Link>

        {/* Bu Hafta Katılımcı */}
        <Link
          href={currentPeriod
            ? `/faaliyetler?year=${currentPeriod.year}&weekFrom=${currentPeriod.weekNo}&weekTo=${currentPeriod.weekNo}`
            : '/faaliyetler'}
          className="premium-card p-4 animate-fade-in-up block group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500">Bu Hafta Katılımcı</p>
            <Users className="h-4 w-4" style={{ color: '#16A34A' }} />
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>
            {formatNumber(participantsThisWeek)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">kişi ulaşıldı</p>
          <p className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#16A34A' }}>
            Kayıtları gör →
          </p>
        </Link>

        {/* Toplam Katılımcı */}
        <Link
          href={`/faaliyetler?year=${currentPeriod?.year ?? now.getFullYear()}`}
          className="premium-card p-4 animate-fade-in-up block group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500">Toplam Katılımcı</p>
            <TrendingUp className="h-4 w-4" style={{ color: '#D97706' }} />
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>
            {formatNumber(participantsAllTime)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">tüm zamanlar</p>
          <p className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D97706' }}>
            Kayıtları gör →
          </p>
        </Link>

        {/* Aktif Dönem */}
        <div className="premium-card p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500">Aktif Dönem</p>
            <Award className="h-4 w-4" style={{ color: '#BE185D' }} />
          </div>
          {currentPeriod ? (
            <>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#0F172A' }}>
                H{currentPeriod.weekNo}
              </p>
              <p className="text-xs text-slate-400 mt-1.5">{formatDate(currentPeriod.startDate)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Dönem yok</p>
          )}
        </div>
      </div>

      {/* ── Uyarı: Veri Girmeyen İller ── */}
      {emptyProvinces.length > 0 && (
        <div className="rounded-xl p-4 border flex gap-3"
          style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>
              Bu Hafta Veri Girmeyen İller ({emptyProvinces.length})
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {emptyProvinces.map((p: any) => (
                <span key={p.name} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Haftalık Trend Sparkline ── */}
      {weeklyData.length > 0 && (
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: '#0E7A3C' }} />
            Son {weeklyData.length} Hafta Trendi
          </h3>
          <WeeklyTrendChart data={weeklyData} />
        </div>
      )}

      {/* ── İki Kolon: Top İller + Birim Dağılımı ── */}
      {canSeeRanking && (top5.length > 0 || unitData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top 5 İl */}
          {top5.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4" style={{ color: '#D97706' }} />
                  Bu Hafta Top {top5.length} İl
                </span>
                <Link href="/karne" className="text-xs font-normal" style={{ color: '#0E7A3C' }}>Tümü →</Link>
              </h3>
              <div className="space-y-2.5">
                {top5.map((p, i) => (
                  <Link
                    key={p.name}
                    href={p.id && currentPeriod
                      ? `/faaliyetler?year=${currentPeriod.year}&weekFrom=${currentPeriod.weekNo}&weekTo=${currentPeriod.weekNo}&provinceId=${p.id}`
                      : '/faaliyetler'}
                    className="flex items-center gap-3 group rounded-lg -mx-1.5 px-1.5 py-0.5 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-bold w-5 text-center"
                      style={{ color: i < 3 ? ['#F59E0B','#94A3B8','#D97706'][i] : '#CBD5E1' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700 group-hover:text-primary">{p.name}</span>
                        <span className="text-xs text-slate-500">{formatNumber(p.participants)} kişi · {p.count} kayıt</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(p.participants / maxParticipants) * 100}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Birim Dağılımı */}
          {unitData.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: '#16A34A' }} />
                Birim Dağılımı (Bu Hafta)
              </h3>
              <div className="flex justify-center -mt-4">
                <UnitPieChart data={unitData} />
              </div>
              <div className="space-y-2 mt-2">
                {unitData.map((u, i) => (
                  <Link
                    key={u.name}
                    href={u.id && currentPeriod
                      ? `/faaliyetler?year=${currentPeriod.year}&weekFrom=${currentPeriod.weekNo}&weekTo=${currentPeriod.weekNo}&unitId=${u.id}`
                      : '/faaliyetler'}
                    className="flex items-center gap-2 text-xs hover:bg-slate-50 p-1.5 rounded"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: unitColors[i % unitColors.length] }} />
                    <span className="font-medium text-slate-700">{u.name}</span>
                    <span className="text-slate-400 ml-auto">{formatNumber(u.participants)} kişi</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

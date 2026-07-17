import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

// Karne API — il bazlı puan hesabı
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const user: SessionUser = {
    id: (session.user as any).id,
    role: (session.user as any).role,
    genderBranch: (session.user as any).genderBranch,
    provinceId: (session.user as any).provinceId,
    regionId: (session.user as any).regionId,
    unitId: (session.user as any).unitId,
    fullName: session.user.name ?? '',
  }

  if (user.role === 'IL_KOORDINATOR') {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
  const unitId = searchParams.get('unitId')
  const genderFilter = searchParams.get('gender') as 'K' | 'E' | 'ALL' | null

  // Yılın tüm dönemleri
  const periods = await prisma.period.findMany({
    where: { year },
    select: { id: true, weekNo: true, month: true },
  })

  const periodIds = periods.map(p => p.id)

  // Puan ağırlıkları
  const weights = await prisma.scoreWeight.findMany({
    include: { activityType: true },
  })
  const weightMap: Record<string, number> = {}
  for (const w of weights) {
    weightMap[`${w.unitId}-${w.activityTypeId}`] = w.weight
  }

  const where = buildActivityFilter(user, genderFilter ?? 'ALL')
  if (periodIds.length > 0) where.periodId = { in: periodIds }
  if (unitId) where.institution = { ...where.institution, unitId: parseInt(unitId) }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      institution: { include: { province: { include: { region: true } }, unit: true } },
      activityType: true,
    },
  })

  // İl bazlı puan hesabı
  const scoreMap: Record<number, {
    provinceId: number
    provinceName: string
    regionName: string
    totalScore: number
    totalActivities: number
    totalParticipants: number
    byUnit: Record<string, { score: number; count: number; participants: number }>
    byMonth: Record<number, number>
  }> = {}

  for (const a of activities) {
    const { institution } = a
    const provinceId = institution.provinceId
    if (!provinceId) continue

    if (!scoreMap[provinceId]) {
      scoreMap[provinceId] = {
        provinceId,
        provinceName: institution.province?.name ?? '',
        regionName: institution.province?.region?.name ?? '',
        totalScore: 0,
        totalActivities: 0,
        totalParticipants: 0,
        byUnit: {},
        byMonth: {},
      }
    }

    const unitName = institution.unit?.name ?? 'Diğer'
    const weightKey = `${institution.unitId}-${a.activityTypeId}`
    const weight = weightMap[weightKey] ?? 1
    const score = a.participantCount * weight

    scoreMap[provinceId].totalScore += score
    scoreMap[provinceId].totalActivities++
    scoreMap[provinceId].totalParticipants += a.participantCount

    if (!scoreMap[provinceId].byUnit[unitName]) {
      scoreMap[provinceId].byUnit[unitName] = { score: 0, count: 0, participants: 0 }
    }
    scoreMap[provinceId].byUnit[unitName].score += score
    scoreMap[provinceId].byUnit[unitName].count++
    scoreMap[provinceId].byUnit[unitName].participants += a.participantCount

    // Aylık trend
    const period = periods.find(p => p.id === a.periodId)
    if (period) {
      scoreMap[provinceId].byMonth[period.month] =
        (scoreMap[provinceId].byMonth[period.month] ?? 0) + score
    }
  }

  // Sırala
  const ranked = Object.values(scoreMap)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }))

  // ProvinceReport verilerini de dahil et (karne detay için)
  const provinceIds = ranked.map(r => r.provinceId)
  const provinceReports = await prisma.provinceReport.findMany({
    where: { provinceId: { in: provinceIds }, year },
  })
  const reportMap: Record<number, any> = {}
  for (const r of provinceReports) reportMap[r.provinceId] = r

  const rankedWithReports = ranked.map(item => ({
    ...item,
    report: reportMap[item.provinceId] || null,
  }))

  return NextResponse.json({ year, ranked: rankedWithReports, periodCount: periods.length })
}

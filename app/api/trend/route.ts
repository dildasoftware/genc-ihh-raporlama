import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

// Trend API — 12 haftalık/aylık trend verisi
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

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
  const genderFilter = searchParams.get('gender') as 'K' | 'E' | 'ALL' | null
  const weeks = parseInt(searchParams.get('weeks') ?? '12')
  const unitId = searchParams.get('unitId')
  const activityTypeId = searchParams.get('activityTypeId')

  // Son N hafta
  const periods = await prisma.period.findMany({
    where: { year },
    orderBy: { weekNo: 'desc' },
    take: weeks,
    select: { id: true, weekNo: true, month: true, startDate: true },
  })

  const periodIds = periods.map((p: any) => p.id)

  const where = buildActivityFilter(user, genderFilter ?? 'ALL')
  if (periodIds.length > 0) where.periodId = { in: periodIds }

  if (activityTypeId) where.activityTypeId = parseInt(activityTypeId)
  if (unitId) {
    where.institution = {
      ...(where.institution ?? {}),
      unitId: parseInt(unitId)
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    select: { periodId: true, participantCount: true, activityTypeId: true, genderBranch: true, activityType: { select: { name: true } } },
  })

  // Hafta bazlı aggregation
  const trendMap: Record<number, {
    periodId: number
    weekNo: number
    month: number
    startDate: Date
    count: number
    participants: number
    kadın: number
    erkek: number
    activityDetails: Record<string, { count: number, participants: number }>
  }> = {}

  for (const p of periods) {
    trendMap[p.id] = {
      periodId: p.id,
      weekNo: p.weekNo,
      month: p.month,
      startDate: p.startDate,
      count: 0,
      participants: 0,
      kadın: 0,
      erkek: 0,
      activityDetails: {}
    }
  }

  for (const a of activities) {
    if (trendMap[a.periodId]) {
      trendMap[a.periodId].count++
      trendMap[a.periodId].participants += a.participantCount
      if (a.genderBranch === 'K') trendMap[a.periodId].kadın += a.participantCount
      else trendMap[a.periodId].erkek += a.participantCount
      
      const typeName = a.activityType.name
      if (!trendMap[a.periodId].activityDetails[typeName]) {
        trendMap[a.periodId].activityDetails[typeName] = { count: 0, participants: 0 }
      }
      trendMap[a.periodId].activityDetails[typeName].count++
      trendMap[a.periodId].activityDetails[typeName].participants += a.participantCount
    }
  }

  const trend = Object.values(trendMap).sort((a, b) => a.weekNo - b.weekNo)

  return NextResponse.json({ year, trend })
}

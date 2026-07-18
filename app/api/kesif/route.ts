import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter, canGenerateReport } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

// Keşif / drill-down API
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
  const periodId = searchParams.get('periodId')
  const yearStr = searchParams.get('year')
  const weekFrom = searchParams.get('weekFrom')
  const weekTo = searchParams.get('weekTo')
  const genderFilter = searchParams.get('gender') as 'K' | 'E' | 'ALL' | null
  const unitId = searchParams.get('unitId')
  const activityTypeId = searchParams.get('activityTypeId')
  const provinceId = searchParams.get('provinceId')
  const groupBy = searchParams.get('groupBy') ?? 'province' // province | unit | activityType | week

  const where = buildActivityFilter(user, genderFilter ?? 'ALL')
  if (periodId) where.periodId = parseInt(periodId)
  if (yearStr) {
    const year = parseInt(yearStr)
    const periodWhere: any = { year }
    if (weekFrom) periodWhere.weekNo = { ...periodWhere.weekNo, gte: parseInt(weekFrom) }
    if (weekTo) periodWhere.weekNo = { ...periodWhere.weekNo, lte: parseInt(weekTo) }
    where.period = periodWhere
  }
  if (unitId) where.institution = { ...where.institution, unitId: parseInt(unitId) }
  if (activityTypeId) where.activityTypeId = parseInt(activityTypeId)
  if (provinceId && user.role !== 'IL_KOORDINATOR') {
    where.institution = { ...where.institution, provinceId: parseInt(provinceId) }
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      institution: { include: { province: true, unit: true } },
      activityType: true,
      faculty: true,
      period: true
    },
    take: 5000,
  })

  // Group & aggregate
  const grouped: Record<string, {
    label: string
    count: number
    participants: number
    byWeek: Record<string, { participants: number; activities: number }>
  }> = {}

  for (const a of activities) {
    let key: string
    let label: string

    if (groupBy === 'unit') {
      key = a.institution.unitId?.toString() ?? '0'
      label = a.institution.unit?.name ?? 'Bilinmiyor'
    } else if (groupBy === 'activityType') {
      key = a.activityTypeId.toString()
      label = a.activityType.name
    } else if (groupBy === 'week') {
      key = a.periodId.toString()
      label = `Hafta ${a.periodId}`
    } else {
      // province (default)
      key = a.institution.provinceId?.toString() ?? '0'
      label = a.institution.province?.name ?? 'Bilinmiyor'
    }

    if (!grouped[key]) grouped[key] = { label, count: 0, participants: 0, byWeek: {} }
    grouped[key].count++
    grouped[key].participants += a.participantCount

    const weekKey = a.period?.weekNo?.toString() || '0'
    if (!grouped[key].byWeek[weekKey]) {
      grouped[key].byWeek[weekKey] = { participants: 0, activities: 0 }
    }
    grouped[key].byWeek[weekKey].participants += a.participantCount
    grouped[key].byWeek[weekKey].activities++
  }

  const result = Object.entries(grouped)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.participants - a.participants)

  // Extra insight for rich dashboard
  const activityTypeMap = new Map<string, number>()
  const instMap = new Map<number, { name: string, prov: string, participants: number }>()

  for (const a of activities) {
    const typeName = a.activityType.name
    activityTypeMap.set(typeName, (activityTypeMap.get(typeName) ?? 0) + a.participantCount)
    
    if (!instMap.has(a.institutionId)) {
      instMap.set(a.institutionId, { name: a.institution.name, prov: a.institution.province?.name ?? '', participants: 0 })
    }
    instMap.get(a.institutionId)!.participants += a.participantCount
  }

  const byActivityType = Array.from(activityTypeMap.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count)
  const topInstitutions = Array.from(instMap.values()).sort((a, b) => b.participants - a.participants).slice(0, 5)

  return NextResponse.json({
    total: { count: activities.length, participants: activities.reduce((s: any, a: any) => s + a.participantCount, 0) },
    grouped: result,
    byActivityType,
    topInstitutions
  })
}

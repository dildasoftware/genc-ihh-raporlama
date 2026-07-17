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
  const genderFilter = searchParams.get('gender') as 'K' | 'E' | 'ALL' | null
  const unitId = searchParams.get('unitId')
  const activityTypeId = searchParams.get('activityTypeId')
  const provinceId = searchParams.get('provinceId')
  const groupBy = searchParams.get('groupBy') ?? 'province' // province | unit | activityType | week

  const where = buildActivityFilter(user, genderFilter ?? 'ALL')
  if (periodId) where.periodId = parseInt(periodId)
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
    },
    take: 500,
  })

  // Group & aggregate
  const grouped: Record<string, {
    label: string
    count: number
    participants: number
    subGroups?: Record<string, { count: number; participants: number }>
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

    if (!grouped[key]) grouped[key] = { label, count: 0, participants: 0 }
    grouped[key].count++
    grouped[key].participants += a.participantCount
  }

  const result = Object.entries(grouped)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.participants - a.participants)

  return NextResponse.json({
    total: { count: activities.length, participants: activities.reduce((s, a) => s + a.participantCount, 0) },
    grouped: result,
  })
}

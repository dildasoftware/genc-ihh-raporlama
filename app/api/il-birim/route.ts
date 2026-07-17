import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

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
  const provinceId = searchParams.get('provinceId')

  if (!provinceId) return NextResponse.json({ error: 'İl seçimi zorunludur' }, { status: 400 })

  const province = await prisma.province.findUnique({
    where: { id: parseInt(provinceId) },
    include: { region: true }
  })
  if (!province) return NextResponse.json({ error: 'İl bulunamadı' }, { status: 404 })

  const where = buildActivityFilter(user, 'ALL')
  where.period = { year }
  where.institution = { ...where.institution, provinceId: parseInt(provinceId) }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      activityType: true,
      institution: { include: { unit: true } },
      period: true
    }
  })

  // Aggregate by Unit
  const unitMap = new Map<string, any>()
  const activityTypeMap = new Map<string, number>()
  const institutionMap = new Map<number, any>()
  
  let totalParticipants = 0

  for (const a of activities) {
    totalParticipants += a.participantCount
    const unitName = a.institution.unit.name
    
    if (!unitMap.has(unitName)) {
      unitMap.set(unitName, { name: unitName, participants: 0, activities: 0, institutions: new Set() })
    }
    const um = unitMap.get(unitName)
    um.participants += a.participantCount
    um.activities += 1
    um.institutions.add(a.institutionId)

    activityTypeMap.set(a.activityType.name, (activityTypeMap.get(a.activityType.name) ?? 0) + a.participantCount)
    
    institutionMap.set(a.institutionId, a.institution)
  }

  const byUnit = Array.from(unitMap.values()).map(u => ({
    name: u.name,
    participants: u.participants,
    activities: u.activities,
    institutions: u.institutions.size
  }))

  const byActivityType = Array.from(activityTypeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const instList = Array.from(institutionMap.values())
    .map(i => {
      const instActivities = activities.filter(a => a.institutionId === i.id)
      return {
        id: i.id,
        name: i.name,
        unitName: i.unit.name,
        totalParticipants: instActivities.reduce((s, a) => s + a.participantCount, 0),
        activities: instActivities.reduce((acc, a) => {
          const typeName = a.activityType.name
          if (!acc[typeName]) acc[typeName] = 0
          acc[typeName] += a.participantCount
          return acc
        }, {} as Record<string, number>)
      }
    })
    .sort((a, b) => b.totalParticipants - a.totalParticipants)

  return NextResponse.json({
    province,
    year,
    totalParticipants,
    totalActivities: activities.length,
    byUnit,
    byActivityType,
    institutions: instList
  })
}

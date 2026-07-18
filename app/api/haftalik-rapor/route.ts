import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { v4 as uuidv4 } from 'uuid'
import { REPORT_TYPES } from '@/lib/reports'

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
  const periodIdStr = searchParams.get('periodId')
  if (!periodIdStr) return NextResponse.json({ error: 'periodId gerekli' }, { status: 400 })

  const periodId = parseInt(periodIdStr)
  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })

  const where = buildActivityFilter(user, 'ALL')
  where.periodId = periodId

  const requestedRegionId = searchParams.get('regionId') ? parseInt(searchParams.get('regionId')!) : null
  const requestedProvinceId = searchParams.get('provinceId') ? parseInt(searchParams.get('provinceId')!) : null

  // Append requested filters if applicable
  if (requestedProvinceId) {
    where.institution = { ...where.institution, provinceId: requestedProvinceId }
  } else if (requestedRegionId) {
    where.institution = { ...where.institution, province: { regionId: requestedRegionId } }
  }
  
  const requestedUnitId = searchParams.get('unitId') ? parseInt(searchParams.get('unitId')!) : null
  if (requestedUnitId) {
    where.institution = { ...where.institution, unitId: requestedUnitId }
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      activityType: true,
      institution: { include: { unit: true, province: true } },
    },
  })

  // Aggregate veriler
  let totalParticipants = 0
  let femaleParticipants = 0
  let maleParticipants = 0
  const institutionMap = new Map<number, any>()
  const activityTypeMap = new Map<string, number>()
  const unitMap = new Map<string, { participants: number, institutions: Set<number>, activities: number }>()

  for (const a of activities) {
    totalParticipants += a.participantCount
    if (a.genderBranch === 'K') femaleParticipants += a.participantCount
    else if (a.genderBranch === 'E') maleParticipants += a.participantCount

    institutionMap.set(a.institutionId, a.institution)

    activityTypeMap.set(a.activityType.name, (activityTypeMap.get(a.activityType.name) ?? 0) + a.participantCount)

    const unitName = a.institution.unit.name
    if (!unitMap.has(unitName)) {
      unitMap.set(unitName, { participants: 0, institutions: new Set(), activities: 0 })
    }
    const um = unitMap.get(unitName)!
    um.participants += a.participantCount
    um.institutions.add(a.institutionId)
    um.activities += 1
  }

  // Önceki haftanın verisi (kıyaslama için)
  let prevTotalParticipants = 0
  let prevTotalActivities = 0
  const prevPeriod = await prisma.period.findFirst({
    where: { year: period.year, weekNo: period.weekNo - 1 }
  })

  if (prevPeriod) {
    const prevWhere = { ...where, periodId: prevPeriod.id }
    const prevActivities = await prisma.activity.findMany({
      where: prevWhere,
      select: { participantCount: true }
    })
    prevTotalActivities = prevActivities.length
    for (const a of prevActivities) {
      prevTotalParticipants += a.participantCount
    }
  }

  const byUnit = Array.from(unitMap.entries()).map(([name, data]) => ({
    name,
    participants: data.participants,
    institutions: data.institutions.size,
    activities: data.activities,
  }))

  const byActivityType = Array.from(activityTypeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const instList = Array.from(institutionMap.values())
    .map((i: any) => {
      const instActivities = activities.filter((a: any) => a.institutionId === i.id)
      return {
        id: i.id,
        name: i.name,
        unitName: i.unit.name,
        provinceName: i.province.name,
        totalParticipants: instActivities.reduce((s: any, a: any) => s + a.participantCount, 0),
        activities: instActivities.map((a: any) => ({
          id: a.id,
          type: a.activityType.name,
          participants: a.participantCount,
          genderBranch: a.genderBranch,
          note: a.note
        }))
      }
    })
    .sort((a, b) => b.totalParticipants - a.totalParticipants)

  return NextResponse.json({
    period,
    totalParticipants,
    totalActivities: activities.length,
    femaleParticipants,
    maleParticipants,
    institutionCount: institutionMap.size,
    byUnit,
    byActivityType,
    institutions: instList,
    prevTotalParticipants,
    prevTotalActivities,
    scopeName: requestedProvinceId ? (instList[0]?.provinceName || 'İl Kapsamı') 
             : user.role === 'IL_KOORDINATOR' ? (instList[0]?.provinceName || 'İl Kapsamı')
             : requestedRegionId ? `${requestedRegionId} Nolu Bölge` 
             : user.role === 'BOLGE_KOORDINATOR' ? `${user.regionId} Nolu Bölge` 
             : (user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI') ? 'Türkiye Geneli' 
             : 'Tüm Kapsam',
    scopeType: requestedProvinceId ? 'PROVINCE' 
             : user.role === 'IL_KOORDINATOR' ? 'PROVINCE'
             : requestedRegionId ? 'REGION' 
             : user.role === 'BOLGE_KOORDINATOR' ? 'REGION' 
             : 'COUNTRY',
    scopeId: requestedProvinceId ? requestedProvinceId 
           : user.role === 'IL_KOORDINATOR' ? user.provinceId
           : requestedRegionId ? requestedRegionId 
           : user.role === 'BOLGE_KOORDINATOR' ? user.regionId 
           : null,
  })
}

// Raporu Kaydet
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const user = session.user as any

  try {
    const body = await request.json()
    const { period, data } = body

    const reportTypeDef = REPORT_TYPES.find((r: any) => r.key === 'HAFTALIK')

    const snapshot = {
      ...data,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      generatedByName: user.name,
    }

    const title = `${data.scopeName} — ${period.year} Yılı ${period.weekNo}. Hafta Raporu`

    const report = await prisma.report.create({
      data: {
        id: uuidv4(),
        type: 'HAFTALIK',
        title,
        scopeType: data.scopeType || 'COUNTRY',
        scopeId: data.scopeId || null,
        year: period.year,
        periodId: period.id,
        snapshotJson: snapshot,
        generatedBy: user.id,
      }
    })

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Report save error:', error)
    return NextResponse.json({ error: error.message || 'Rapor kaydedilemedi' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter, canWrite } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

// GET: Aktiviteleri listele
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
  const genderFilter = searchParams.get('gender') as any

  const where = buildActivityFilter(user, genderFilter || 'ALL')
  if (periodId) where.periodId = parseInt(periodId)

  const activities = await prisma.activity.findMany({
    where,
    include: {
      institution: { include: { province: true, unit: true } },
      faculty: true,
      activityType: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(activities)
}

// POST: Yeni aktivite ekle
export async function POST(request: NextRequest) {
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

  if (!canWrite(user)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { periodId, institutionId, facultyId, activityTypeId, participantCount, location, note } = body

    if (!periodId || !institutionId || !activityTypeId || !participantCount) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    if (!user.genderBranch) {
      return NextResponse.json({ error: 'Kullanıcının cinsiyet kolu tanımlı değil' }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        periodId: parseInt(periodId),
        institutionId: parseInt(institutionId),
        facultyId: facultyId ? parseInt(facultyId) : null,
        activityTypeId: parseInt(activityTypeId),
        participantCount: parseInt(participantCount),
        genderBranch: user.genderBranch,
        location: location || null,
        note: note || null,
        createdBy: user.id,
      },
      include: {
        institution: { include: { province: true, unit: true } },
        activityType: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Activity',
        entityId: activity.id,
        metaJson: JSON.stringify({ periodId, institutionId, participantCount }),
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Aktivite oluşturma hatası:', error)
    return NextResponse.json({ error: 'Aktivite kaydedilemedi' }, { status: 500 })
  }
}

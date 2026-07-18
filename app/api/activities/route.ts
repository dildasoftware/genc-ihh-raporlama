import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter, canWrite } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

function sessionUser(session: any): SessionUser {
  return {
    id: session.user.id,
    role: session.user.role,
    genderBranch: session.user.genderBranch,
    provinceId: session.user.provinceId,
    regionId: session.user.regionId,
    unitId: session.user.unitId,
    fullName: session.user.name ?? '',
  }
}

/**
 * Faaliyet detay listesi — sistemdeki her sayının indiği HAM KAYIT katmanı.
 *
 * Panel/karne/karşılaştırmadaki hiçbir toplam "sadece bir sayı" değildir;
 * hepsi buraya filtreli link verir ve kaynak kayıtlar tek tek görünür.
 *
 * Filtreler: provinceId, regionId, unitId, activityTypeId, gender,
 *            periodId, weekFrom/weekTo, year, q (kurum adı), institutionId
 * Sayfalama: page + pageSize. Rol kapsaması buildActivityFilter ile korunur.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const sp = new URL(request.url).searchParams
  const year = parseInt(sp.get('year') ?? String(new Date().getFullYear()))
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(10, parseInt(sp.get('pageSize') ?? '25')))

  // Rol kapsaması (il koordinatörü kendi ili+kolu, bölge koord. bölgesi…)
  const where = buildActivityFilter(user, (sp.get('gender') as any) ?? 'ALL')

  // Dönem filtresi: periodId > hafta aralığı > yıl
  if (sp.get('periodId')) {
    where.periodId = parseInt(sp.get('periodId')!)
  } else {
    const periods = await prisma.period.findMany({
      where: {
        year,
        ...(sp.get('weekFrom') || sp.get('weekTo')
          ? {
              weekNo: {
                ...(sp.get('weekFrom') ? { gte: parseInt(sp.get('weekFrom')!) } : {}),
                ...(sp.get('weekTo') ? { lte: parseInt(sp.get('weekTo')!) } : {}),
              },
            }
          : {}),
      },
      select: { id: true },
    })
    where.periodId = { in: periods.length ? periods.map((p: any) => p.id) : [-1] }
  }

  // Kurum filtreleri — rol kapsamasıyla birleştir (üzerine yazma!)
  const instFilter: any = { ...(where.institution ?? {}) }
  if (sp.get('provinceId')) instFilter.provinceId = parseInt(sp.get('provinceId')!)
  if (sp.get('regionId')) {
    instFilter.province = { ...(instFilter.province ?? {}), regionId: parseInt(sp.get('regionId')!) }
  }
  if (sp.get('unitId')) instFilter.unitId = parseInt(sp.get('unitId')!)
  if (sp.get('q')) instFilter.name = { contains: sp.get('q')!, mode: 'insensitive' }
  if (Object.keys(instFilter).length > 0) where.institution = instFilter

  if (sp.get('institutionId')) where.institutionId = parseInt(sp.get('institutionId')!)
  if (sp.get('activityTypeId')) where.activityTypeId = parseInt(sp.get('activityTypeId')!)

  const [total, sums, activities] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.aggregate({ where, _sum: { participantCount: true } }),
    prisma.activity.findMany({
      where,
      include: {
        period: { select: { weekNo: true, year: true, startDate: true, endDate: true } },
        institution: {
          include: {
            province: { include: { region: { select: { name: true } } } },
            unit: { select: { name: true } },
            schoolType: { select: { name: true } },
          },
        },
        faculty: { select: { name: true } },
        activityType: { select: { name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: [{ period: { weekNo: 'desc' } }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    items: activities.map(a => ({
      id: a.id,
      week: a.period.weekNo,
      year: a.period.year,
      weekStart: a.period.startDate,
      weekEnd: a.period.endDate,
      provinceId: a.institution.provinceId,
      provinceName: a.institution.province?.name ?? '',
      regionName: a.institution.province?.region?.name ?? '',
      unitName: a.institution.unit?.name ?? '',
      institutionId: a.institutionId,
      institutionName: a.institution.name,
      schoolType: a.institution.schoolType?.name ?? null,
      facultyName: a.faculty?.name ?? null,
      activityType: a.activityType.name,
      participantCount: a.participantCount,
      gender: a.genderBranch,
      note: a.note,
      location: a.location,
      createdByName: a.user.fullName,
      createdAt: a.createdAt,
    })),
    total,
    totalParticipants: sums._sum.participantCount ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  })
}

// POST: Yeni aktivite ekle (mevcut davranış korunuyor)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

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

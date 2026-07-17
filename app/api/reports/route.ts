import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { reportTypeDef, aiTypeDef, type ArchiveItem } from '@/lib/reports'

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
 * Arşiv listesi — Report ve AiInsight kayıtlarını tek listede döndürür.
 *
 * Filtreler: kind (REPORT/AI), tür, il, yıl, tarih aralığı, arşiv durumu, arama
 * Sayfalama: page + pageSize
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') ?? 'ALL'          // ALL | REPORT | AI
  const type = searchParams.get('type')
  const scopeId = searchParams.get('scopeId')
  const regionId = searchParams.get('regionId')
  const year = searchParams.get('year')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const q = (searchParams.get('q') ?? '').trim()
  const status = searchParams.get('status') ?? 'ACTIVE'   // ACTIVE | ARCHIVED | ALL
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') ?? '12')))

  // ── Görünürlük: kullanıcı hangi illerin kaydını görebilir ──
  const visibleProvinces = await buildProvinceScope(user, prisma)

  const scopeWhere =
    visibleProvinces === null
      ? {} // Admin / merkez — her şeyi görür
      : {
          OR: [
            { scopeType: 'PROVINCE', scopeId: { in: visibleProvinces } },
            // Bölge koordinatörü kendi bölge raporlarını da görür
            ...(user.regionId ? [{ scopeType: 'REGION', scopeId: user.regionId }] : []),
          ],
        }

  const archiveWhere =
    status === 'ACTIVE' ? { deletedAt: null }
    : status === 'ARCHIVED' ? { deletedAt: { not: null } }
    : {}

  const dateWhere =
    from || to
      ? {
          generatedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {}

  const regionWhere: any = {}
  if (regionId) {
    const regionIdInt = parseInt(regionId)
    const regionProvinces = await prisma.province.findMany({
      where: { regionId: regionIdInt },
      select: { id: true }
    })
    const provIds = regionProvinces.map(p => p.id)
    regionWhere.OR = [
      { scopeType: 'REGION', scopeId: regionIdInt },
      { scopeType: 'PROVINCE', scopeId: { in: provIds } }
    ]
  }

  const commonWhere: any = {
    ...archiveWhere,
    ...dateWhere,
    ...scopeWhere,
    ...regionWhere,
    ...(scopeId ? { scopeId: parseInt(scopeId) } : {}),
    ...(year ? { year: parseInt(year) } : {}),
    ...(type ? { type } : {}),
  }

  const searchWhere = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { scopeName: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const items: ArchiveItem[] = []

  // ── Raporlar ──
  if (kind === 'ALL' || kind === 'REPORT') {
    const reports = await prisma.report.findMany({
      where: { ...commonWhere, ...searchWhere },
      include: { user: { select: { fullName: true } } },
      orderBy: { generatedAt: 'desc' },
      take: 200,
    })
    for (const r of reports) {
      const def = reportTypeDef(r.type)
      items.push({
        id: r.id,
        kind: 'REPORT',
        type: r.type,
        typeLabel: def.label,
        color: def.color,
        bg: def.bg,
        title: r.title,
        scopeType: r.scopeType,
        scopeId: r.scopeId,
        scopeName: r.scopeName,
        year: r.year,
        genderScope: r.genderScope,
        summary: r.summaryJson,
        generatedAt: r.generatedAt.toISOString(),
        generatedByName: r.user.fullName,
        isArchived: r.deletedAt !== null,
      })
    }
  }

  // ── AI analizleri ──
  if (kind === 'ALL' || kind === 'AI') {
    const aiSearchWhere = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { scopeName: { contains: q, mode: 'insensitive' as const } },
            { response: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const insights = await prisma.aiInsight.findMany({
      where: { ...commonWhere, ...aiSearchWhere },
      include: { user: { select: { fullName: true } } },
      orderBy: { generatedAt: 'desc' },
      take: 200,
    })
    for (const a of insights) {
      const def = aiTypeDef(a.type)
      items.push({
        id: a.id,
        kind: 'AI',
        type: a.type,
        typeLabel: def.label,
        color: def.color,
        bg: def.bg,
        title: a.title || def.label,
        scopeType: a.scopeType,
        scopeId: a.scopeId,
        scopeName: a.scopeName,
        year: a.year,
        summary: null,
        excerpt: a.response.slice(0, 220),
        generatedAt: a.generatedAt.toISOString(),
        generatedByName: a.user.fullName,
        isArchived: a.deletedAt !== null,
      })
    }
  }

  // İki kaynağı birleştirip tarihe göre sırala, sonra sayfala
  items.sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt))

  const total = items.length
  const start = (page - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return NextResponse.json({
    items: pageItems,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  })
}

/**
 * Rapor/karne kaydet — üretilen rapor kalıcı arşive girer.
 * Aynı kapsam + yıl + tür için tekrar kaydedilirse ÜZERİNE YAZILMAZ;
 * yeni sürüm olarak eklenir (tarihsel takip için).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const body = await request.json()
  const { type, scopeType, scopeId, scopeName, year, periodId, title, summaryJson, snapshotJson, genderScope } = body

  if (!type || !scopeType || !title) {
    return NextResponse.json({ error: 'type, scopeType ve title gerekli' }, { status: 400 })
  }

  // Yetki: kullanıcı bu kapsam için rapor üretebilir mi?
  if (scopeType === 'PROVINCE' && scopeId) {
    const visible = await buildProvinceScope(user, prisma)
    if (visible !== null && !visible.includes(scopeId)) {
      return NextResponse.json({ error: 'Bu il için yetkiniz yok' }, { status: 403 })
    }
  }
  if (scopeType === 'REGION' && scopeId) {
    if (user.role === 'IL_KOORDINATOR') {
      return NextResponse.json({ error: 'Bölge raporu yetkiniz yok' }, { status: 403 })
    }
    if (user.role === 'BOLGE_KOORDINATOR' && user.regionId !== scopeId) {
      return NextResponse.json({ error: 'Bu bölge için yetkiniz yok' }, { status: 403 })
    }
  }
  if (scopeType === 'COUNTRY' && user.role !== 'ADMIN' && user.role !== 'MERKEZ_BIRIM_BASKANI') {
    return NextResponse.json({ error: 'Ülke raporu yetkiniz yok' }, { status: 403 })
  }

  const report = await prisma.report.create({
    data: {
      type,
      scopeType,
      scopeId: scopeId ?? null,
      scopeName: scopeName ?? null,
      year: year ?? null,
      periodId: periodId ?? null,
      title,
      summaryJson: summaryJson ?? undefined,
      snapshotJson: snapshotJson ?? undefined,
      genderScope: genderScope ?? null,
      generatedBy: user.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'RAPOR_KAYDET',
      entity: 'Report',
      entityId: report.id,
      metaJson: JSON.stringify({ type, scopeType, scopeId, year }),
    },
  })

  return NextResponse.json({ id: report.id, ok: true })
}

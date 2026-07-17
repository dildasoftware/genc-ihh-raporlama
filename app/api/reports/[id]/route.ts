import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { reportTypeDef, aiTypeDef } from '@/lib/reports'

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

/** Kullanıcı bu kaydı görebilir mi? */
async function canAccess(user: SessionUser, scopeType: string | null, scopeId: number | null) {
  if (user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI') return true
  if (scopeType === 'PROVINCE' && scopeId) {
    const visible = await buildProvinceScope(user, prisma)
    return visible === null || visible.includes(scopeId)
  }
  if (scopeType === 'REGION' && scopeId) {
    return user.role === 'BOLGE_KOORDINATOR' && user.regionId === scopeId
  }
  if (scopeType === 'COUNTRY') return true // ülke özeti herkese açık bağlam
  return false
}

/** Kayıt hem Report hem AiInsight olabilir — ikisinde de ara */
async function findRecord(id: string) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: { user: { select: { fullName: true } } },
  })
  if (report) return { kind: 'REPORT' as const, record: report }

  const ai = await prisma.aiInsight.findUnique({
    where: { id },
    include: { user: { select: { fullName: true } } },
  })
  if (ai) return { kind: 'AI' as const, record: ai }

  return null
}

// ==================== GET — raporu yeniden aç ====================

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const { id } = await params
  const found = await findRecord(id)
  if (!found) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const r: any = found.record
  if (!(await canAccess(user, r.scopeType, r.scopeId))) {
    return NextResponse.json({ error: 'Bu kayıt için yetkiniz yok' }, { status: 403 })
  }

  if (found.kind === 'REPORT') {
    const def = reportTypeDef(r.type)
    return NextResponse.json({
      kind: 'REPORT',
      id: r.id,
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
      snapshot: r.snapshotJson,
      generatedAt: r.generatedAt.toISOString(),
      generatedByName: r.user.fullName,
      isArchived: r.deletedAt !== null,
    })
  }

  const def = aiTypeDef(r.type)
  return NextResponse.json({
    kind: 'AI',
    id: r.id,
    type: r.type,
    typeLabel: def.label,
    color: def.color,
    bg: def.bg,
    title: r.title || def.label,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    year: r.year,
    response: r.response,
    generatedAt: r.generatedAt.toISOString(),
    generatedByName: r.user.fullName,
    isArchived: r.deletedAt !== null,
  })
}

// ==================== PATCH — arşivle / geri yükle ====================

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const { id } = await params
  const { action } = await request.json() as { action: 'archive' | 'restore' }
  if (action !== 'archive' && action !== 'restore') {
    return NextResponse.json({ error: "action 'archive' veya 'restore' olmalı" }, { status: 400 })
  }

  const found = await findRecord(id)
  if (!found) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const r: any = found.record
  if (!(await canAccess(user, r.scopeType, r.scopeId))) {
    return NextResponse.json({ error: 'Bu kayıt için yetkiniz yok' }, { status: 403 })
  }

  // Arşivleme geri alınabilir bir işlemdir — kayıt asla silinmez, sadece
  // deletedAt işaretlenir. Böylece "arşivlenenler" görünümünden geri yüklenebilir.
  const deletedAt = action === 'archive' ? new Date() : null

  if (found.kind === 'REPORT') {
    await prisma.report.update({ where: { id }, data: { deletedAt } })
  } else {
    await prisma.aiInsight.update({ where: { id }, data: { deletedAt } })
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: action === 'archive' ? 'ARSIVLE' : 'GERI_YUKLE',
      entity: found.kind === 'REPORT' ? 'Report' : 'AiInsight',
      entityId: id,
    },
  })

  return NextResponse.json({ ok: true, isArchived: deletedAt !== null })
}

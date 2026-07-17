import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter, canGenerateReport } from '@/lib/authz'
import { callAI } from '@/lib/ai'
import {
  KARNE_SYSTEM,
  HAFTALIK_RAPOR_SYSTEM,
  KARSILASTIRMA_SYSTEM,
  TREND_SYSTEM,
  IL_BIRIM_SYSTEM,
  SERBEST_SYSTEM,
} from '@/lib/ai-prompts'
import type { SessionUser } from '@/lib/authz'

const systemPrompts: Record<string, string> = {
  KARNE: KARNE_SYSTEM,
  HAFTALIK_RAPOR: HAFTALIK_RAPOR_SYSTEM,
  KARSILASTIRMA: KARSILASTIRMA_SYSTEM,
  TREND: TREND_SYSTEM,
  IL_BIRIM: IL_BIRIM_SYSTEM,
  SERBEST: SERBEST_SYSTEM,
}

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

  if (!canGenerateReport(user)) {
    return NextResponse.json({ error: 'AI analiz yetkisi yok' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { type, scopeType, scopeId, periodId, userPrompt, contextData, scopeName, year, title } = body

    if (!type || !systemPrompts[type]) {
      return NextResponse.json({ error: 'Geçersiz analiz türü' }, { status: 400 })
    }

    let dynamicSystemPrompt = systemPrompts[type]
    
    if (user.role === 'IL_KOORDINATOR') {
      dynamicSystemPrompt += `\n\n[GÜVENLİK KURALI]: Sen sadece kullanıcının yetkili olduğu ilin verilerini analiz etmekle yetkili bir asistansın. Kullanıcı sana kasıtlı olarak Türkiye geneli, diğer iller veya bölgeler hakkında soru sorarsa KESİNLİKLE cevaplama ve "Sistem yöneticisi tarafından yalnızca kendi ilinize ait verileri analiz etme yetkiniz bulunmaktadır." diyerek isteği reddet.`
    }

    // Context veriyi kullanıcının yetkili olduğu scope'la sınırla
    let finalContext = contextData
    if (!finalContext) {
      finalContext = await buildContextData(user, type, scopeType, scopeId, periodId)
    }

    const fullUserPrompt = userPrompt
      ? `${userPrompt}\n\nVeri:\n${JSON.stringify(finalContext, null, 2)}`
      : `Veri:\n${JSON.stringify(finalContext, null, 2)}`

    const response = await callAI(dynamicSystemPrompt, fullUserPrompt, 1024)

    // Kalıcı kayıt — AI analizi arşivde aranabilir/yeniden açılabilir olmalı
    const resolvedYear = year ? parseInt(String(year)) : new Date().getFullYear()
    const insight = await prisma.aiInsight.create({
      data: {
        type,
        scopeType: scopeType ?? 'COUNTRY',
        scopeId: scopeId ? parseInt(scopeId) : null,
        scopeName: scopeName ?? null,
        title: title || `${scopeName ?? 'Türkiye'} — ${resolvedYear}`,
        year: resolvedYear,
        periodId: periodId ? parseInt(periodId) : null,
        prompt: fullUserPrompt.slice(0, 2000),
        response,
        generatedBy: user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_ANALIZ_URET',
        entity: 'AiInsight',
        entityId: insight.id,
        metaJson: JSON.stringify({ type, scopeType, scopeId, year: resolvedYear }),
      },
    })

    return NextResponse.json({ id: insight.id, response })
  } catch (error: any) {
    console.error('AI analiz hatası:', error)
    return NextResponse.json({ error: error.message ?? 'AI hatası' }, { status: 500 })
  }
}

async function buildContextData(
  user: SessionUser,
  type: string,
  scopeType: string,
  scopeId: number | null,
  periodId: number | null
) {
  const where = buildActivityFilter(user)
  if (periodId) where.periodId = periodId

  const activities = await prisma.activity.findMany({
    where,
    include: {
      institution: { include: { province: true, unit: true } },
      activityType: true,
    },
    take: 500,
  })

  // Aggregate by unit
  const byUnit: Record<string, { count: number; participants: number }> = {}
  const byProvince: Record<string, { count: number; participants: number }> = {}

  for (const a of activities) {
    const unitName = a.institution.unit?.name ?? 'Diğer'
    if (!byUnit[unitName]) byUnit[unitName] = { count: 0, participants: 0 }
    byUnit[unitName].count++
    byUnit[unitName].participants += a.participantCount

    const provName = a.institution.province?.name ?? 'Bilinmiyor'
    if (!byProvince[provName]) byProvince[provName] = { count: 0, participants: 0 }
    byProvince[provName].count++
    byProvince[provName].participants += a.participantCount
  }

  return {
    toplamFaaliyet: activities.length,
    toplamKatilimci: activities.reduce((s, a) => s + a.participantCount, 0),
    birimBazinda: byUnit,
    ilBazinda: byProvince,
    kol: user.genderBranch ?? 'Birleşik',
  }
}

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

  const insights = await prisma.aiInsight.findMany({
    where: {
      generatedBy: user.role === 'ADMIN' ? undefined : user.id,
      deletedAt: null,
    },
    include: { user: { select: { fullName: true } } },
    orderBy: { generatedAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(insights)
}

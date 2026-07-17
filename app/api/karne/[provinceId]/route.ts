import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { loadKarne } from '@/lib/karne-data'

/**
 * Tek ilin detaylı karnesi — PDF'e basılan sayfanın veri kaynağı.
 * Sıralama ulusal olarak hesaplanır, kurum kırılımı bu ile aittir.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provinceId: string }> }
) {
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

  const { provinceId: pidStr } = await params
  const provinceId = parseInt(pidStr)
  if (!provinceId) return NextResponse.json({ error: 'Geçersiz il' }, { status: 400 })

  // Yetki: kullanıcı bu ili görebiliyor mu?
  const visible = await buildProvinceScope(user, prisma)
  if (visible !== null && !visible.includes(provinceId)) {
    return NextResponse.json({ error: 'Bu il için yetkiniz yok' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const gender =
    user.role === 'IL_KOORDINATOR'
      ? user.genderBranch
      : (searchParams.get('gender') as 'K' | 'E' | 'ALL' | null)

  const province = await prisma.province.findUnique({
    where: { id: provinceId },
    include: { region: true },
  })
  if (!province) return NextResponse.json({ error: 'İl bulunamadı' }, { status: 404 })

  const { ranked, summary, institutionsOf, reportMap, periods } = await loadKarne({
    year,
    gender,
    unitId: searchParams.get('unitId'),
    activityTypeId: searchParams.get('activityTypeId'),
    weekFrom: searchParams.get('weekFrom'),
    weekTo: searchParams.get('weekTo'),
  })

  const karne = ranked.find(r => r.provinceId === provinceId) ?? null

  // Bölge içi sıra
  const regionRanked = ranked.filter(r => r.regionName === province.region?.name)
  const regionRank = regionRanked.findIndex(r => r.provinceId === provinceId) + 1

  return NextResponse.json({
    year,
    weekCount: periods.length,
    province: { id: province.id, name: province.name, regionName: province.region?.name ?? '' },
    karne,
    regionRank: regionRank || null,
    regionCount: regionRanked.length,
    nationalCount: ranked.length,
    institutions: institutionsOf(provinceId),
    report: reportMap.get(provinceId) ?? null,
    summary,
  })
}

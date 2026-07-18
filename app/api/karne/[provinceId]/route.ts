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
  const gender =
    user.role === 'IL_KOORDINATOR'
      ? user.genderBranch
      : (searchParams.get('gender') as 'K' | 'E' | 'ALL' | null)

  const type = searchParams.get('type') || 'YEAR'
  const p1 = searchParams.get('p1') || String(new Date().getFullYear())
  const p2 = searchParams.get('p2')

  const parsePeriod = (p: string | null) => {
    if (!p) return null
    if (type === 'YEAR') return { year: parseInt(p) }
    if (type === 'MONTH') {
      const [y, m] = p.split('-')
      return { year: parseInt(y), month: parseInt(m) }
    }
    if (type === 'WEEK') {
      const [y, w] = p.split('-')
      return { year: parseInt(y), weekFrom: w, weekTo: w }
    }
    return null
  }

  const p1Filters = parsePeriod(p1)
  const p2Filters = parsePeriod(p2)

  const province = await prisma.province.findUnique({
    where: { id: provinceId },
    include: { region: true },
  })
  if (!province) return NextResponse.json({ error: 'İl bulunamadı' }, { status: 404 })

  const commonFilters = {
    gender,
    unitId: searchParams.get('unitId'),
    activityTypeId: searchParams.get('activityTypeId'),
  }

  const buildData = async (filters: any) => {
    if (!filters) return null
    const { ranked, summary, institutionsOf, reportMap, periods } = await loadKarne({
      ...commonFilters,
      ...filters,
    })
    const karne = ranked.find((r: any) => r.provinceId === provinceId) ?? null
    const regionRanked = ranked.filter((r: any) => r.regionName === province.region?.name)
    const regionRank = regionRanked.findIndex(r => r.provinceId === provinceId) + 1

    return {
      year: filters.year,
      weekCount: periods.length,
      karne,
      regionRank: regionRank || null,
      regionCount: regionRanked.length,
      nationalCount: ranked.length,
      institutions: institutionsOf(provinceId),
      report: reportMap.get(provinceId) ?? null,
      summary,
    }
  }

  const data1 = await buildData(p1Filters)
  const data2 = await buildData(p2Filters)

  return NextResponse.json({
    province: { id: province.id, name: province.name, regionName: province.region?.name ?? '' },
    data1,
    data2,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { loadKarne } from '@/lib/karne-data'

/**
 * Karne listesi — 5 boyutlu il karneleri, ulusal sıralamayla.
 *
 * Kaynak: Activity (haftalık soru formu) + ProvinceReport (künye).
 * Filtreler genelden özele: bölge → il → birim → faaliyet türü → hafta → kol
 */
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
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  // İl koordinatörünün kolu kilitli; diğerleri seçebilir
  const gender =
    user.role === 'IL_KOORDINATOR'
      ? user.genderBranch
      : (searchParams.get('gender') as 'K' | 'E' | 'ALL' | null)

  // Merkez birim başkanı yalnızca kendi birimini görür
  const unitId =
    user.role === 'MERKEZ_BIRIM_BASKANI' && user.unitId
      ? String(user.unitId)
      : searchParams.get('unitId')

  const { ranked, summary, periods } = await loadKarne({
    year,
    gender,
    unitId,
    regionId: searchParams.get('regionId'),
    activityTypeId: searchParams.get('activityTypeId'),
    weekFrom: searchParams.get('weekFrom'),
    weekTo: searchParams.get('weekTo'),
  })

  // Görünürlük: sıralama ulusal kalır, listelenen iller role göre kısıtlanır
  const visible = await buildProvinceScope(user, prisma)
  const visibleRanked = visible === null ? ranked : ranked.filter((r: any) => visible.includes(r.provinceId))

  return NextResponse.json({
    year,
    weekCount: periods.length,
    ranked: visibleRanked,
    summary,
    /** Kullanıcı ulusal sıralamanın tamamını görüyor mu */
    isNationalView: visible === null,
  })
}

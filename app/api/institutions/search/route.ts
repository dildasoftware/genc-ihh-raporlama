import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — Kurum adı autocomplete araması
// /api/institutions/search?q=Yıl&unitType=Üniversite&provinceId=6
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const unitType = searchParams.get('unitType') || ''
  const provinceId = parseInt(searchParams.get('provinceId') || '0')

  if (q.length < 2) return NextResponse.json([])

  // Birim adını unit tablosundan bul
  const unit = unitType
    ? await prisma.unit.findFirst({ where: { name: unitType } })
    : null

  const where: any = {
    name: { contains: q, mode: 'insensitive' },
  }
  if (unit) where.unitId = unit.id
  if (provinceId) where.provinceId = provinceId

  const institutions = await prisma.institution.findMany({
    where,
    select: { id: true, name: true, unit: { select: { name: true } }, schoolType: { select: { name: true } } },
    take: 15,
    orderBy: { name: 'asc' },
  })

  // provinceId filtresi ile bulunamadıysa, tüm illerdeki kurumları da göster
  if (institutions.length === 0 && provinceId) {
    const allInstitutions = await prisma.institution.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, ...(unit ? { unitId: unit.id } : {}) },
      select: { id: true, name: true, unit: { select: { name: true } }, province: { select: { name: true } } },
      take: 15,
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(allInstitutions)
  }

  return NextResponse.json(institutions)
}

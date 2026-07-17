import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildInstitutionFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

// GET: Kurumları listele
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
  const unitId = searchParams.get('unitId')

  const where = buildInstitutionFilter(user)
  if (unitId) where.unitId = parseInt(unitId)

  const institutions = await prisma.institution.findMany({
    where,
    include: {
      province: { select: { name: true } },
      unit: { select: { name: true } },
      schoolType: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(institutions)
}

// POST: Yeni kurum ekle
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

  try {
    const body = await request.json()
    const { name, unitId, schoolTypeId } = body

    if (!name || !unitId) {
      return NextResponse.json({ error: 'Kurum adı ve birim gereklidir' }, { status: 400 })
    }

    const provinceId = user.role === 'IL_KOORDINATOR' ? user.provinceId : body.provinceId
    if (!provinceId) {
      return NextResponse.json({ error: 'İl bilgisi gereklidir' }, { status: 400 })
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        provinceId,
        unitId: parseInt(unitId),
        schoolTypeId: schoolTypeId ? parseInt(schoolTypeId) : null,
      },
      include: {
        province: { select: { name: true } },
        unit: { select: { name: true } },
        schoolType: { select: { name: true } },
      },
    })

    return NextResponse.json(institution, { status: 201 })
  } catch (error) {
    console.error('Kurum oluşturma hatası:', error)
    return NextResponse.json({ error: 'Kurum kaydedilemedi' }, { status: 500 })
  }
}

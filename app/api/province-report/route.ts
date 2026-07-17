import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — İl rapor verisini çek
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provinceId = parseInt(searchParams.get('provinceId') || '0')
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  if (!provinceId) return NextResponse.json({ error: 'provinceId gerekli' }, { status: 400 })

  const report = await prisma.provinceReport.findUnique({
    where: { provinceId_year: { provinceId, year } },
    include: { province: true },
  })

  if (!report) return NextResponse.json(null)
  return NextResponse.json(report)
}

// POST — İl rapor verisi kaydet/güncelle (upsert)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const user = session.user as any
  const body = await request.json()
  const { provinceId, year, ...data } = body

  if (!provinceId || !year) {
    return NextResponse.json({ error: 'provinceId ve year gerekli' }, { status: 400 })
  }

  // Yetki kontrolü: İl koordinatörü sadece kendi ilini düzenleyebilir
  if (user.role === 'IL_KOORDINATOR' && user.provinceId !== provinceId) {
    return NextResponse.json({ error: 'Bu il için yetkiniz yok' }, { status: 403 })
  }

  try {
    const report = await prisma.provinceReport.upsert({
      where: { provinceId_year: { provinceId, year } },
      create: {
        provinceId,
        year,
        createdBy: user.id,
        ...data,
      },
      update: {
        ...data,
      },
    })

    return NextResponse.json(report)
  } catch (err: any) {
    console.error('ProvinceReport upsert error:', err)
    return NextResponse.json({ error: 'Kayıt başarısız: ' + err.message }, { status: 500 })
  }
}

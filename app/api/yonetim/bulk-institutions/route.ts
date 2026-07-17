import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const data = await request.json()

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Geçersiz veri formatı, dizi bekleniyor' }, { status: 400 })
    }

    const createdCount = await prisma.$transaction(async (tx) => {
      let count = 0
      for (const item of data) {
        if (!item.name || !item.provinceId || !item.unitId) continue

        // Skip if already exists in that province
        const existing = await tx.institution.findFirst({
          where: {
            name: item.name,
            provinceId: parseInt(item.provinceId)
          }
        })

        if (!existing) {
          await tx.institution.create({
            data: {
              name: item.name,
              provinceId: parseInt(item.provinceId),
              unitId: parseInt(item.unitId)
            }
          })
          count++
        }
      }
      return count
    })

    return NextResponse.json({ success: true, count: createdCount })
  } catch (error: any) {
    console.error('Toplu yükleme hatası:', error)
    return NextResponse.json({ error: 'Toplu kurum yüklenirken bir hata oluştu' }, { status: 500 })
  }
}

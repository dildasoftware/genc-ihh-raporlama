import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const institutionId = searchParams.get('institutionId')

  if (!institutionId) {
    return NextResponse.json({ error: 'institutionId gereklidir' }, { status: 400 })
  }

  const faculties = await prisma.faculty.findMany({
    where: { institutionId: parseInt(institutionId) },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(faculties)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, institutionId } = body

    if (!name || !institutionId) {
      return NextResponse.json({ error: 'Ad ve kurum gereklidir' }, { status: 400 })
    }

    const faculty = await prisma.faculty.create({
      data: { name, institutionId: parseInt(institutionId) },
    })

    return NextResponse.json(faculty, { status: 201 })
  } catch (error) {
    console.error('Fakülte oluşturma hatası:', error)
    return NextResponse.json({ error: 'Fakülte kaydedilemedi' }, { status: 500 })
  }
}

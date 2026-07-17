import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role
  if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'MERKEZ_BIRIM_BASKANI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab')

  try {
    switch (tab) {
      case 'users':
        const users = await prisma.user.findMany({
          include: { province: true, region: true, unit: true },
          orderBy: { fullName: 'asc' }
        })
        return NextResponse.json(users)

      case 'institutions':
        const institutions = await prisma.institution.findMany({
          include: { province: true, unit: true, schoolType: true, faculties: true },
          orderBy: { name: 'asc' }
        })
        return NextResponse.json(institutions)

      case 'periods':
        const periods = await prisma.period.findMany({
          orderBy: { startDate: 'desc' }
        })
        return NextResponse.json(periods)

      case 'weights':
        const weights = await prisma.scoreWeight.findMany({
          include: { unit: true, activityType: true }
        })
        return NextResponse.json(weights)

      case 'aiLogs':
        const aiLogs = await prisma.aiInsight.findMany({
          include: { user: true },
          orderBy: { generatedAt: 'desc' },
          take: 100
        })
        return NextResponse.json(aiLogs)

      case 'auditLogs':
        const auditLogs = await prisma.auditLog.findMany({
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 100
        })
        return NextResponse.json(auditLogs)

      default:
        return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
    }
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role
  if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'MERKEZ_BIRIM_BASKANI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Eksik parametre: userId' }, { status: 400 })
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Kullanıcı silinemedi:', error)
    return NextResponse.json({ error: 'Kullanıcı silinirken bir hata oluştu' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role
  if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'MERKEZ_BIRIM_BASKANI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, fullName, email, role, regionId, provinceId, unitId, isActive, genderBranch } = body

    if (!id) {
      return NextResponse.json({ error: 'Kullanıcı ID eksik' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        email,
        role,
        regionId: regionId ? parseInt(regionId) : null,
        provinceId: provinceId ? parseInt(provinceId) : null,
        unitId: unitId ? parseInt(unitId) : null,
        isActive,
        genderBranch: genderBranch || null
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Kullanıcı güncellenemedi:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanılıyor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Kullanıcı güncellenirken bir hata oluştu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role
  if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'MERKEZ_BIRIM_BASKANI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fullName, email, role, regionId, provinceId, unitId, isActive, genderBranch } = body

    // Create default password hash for "123456"
    // $2a$10$wJtH/p/7K98zI7.1g9jK9.W5eWjFqWzFjFqWzFjFqWzFjFqWzFjFq (dummy bcrypt, let's use a dynamic one if bcryptjs is installed)
    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash('123456', 10)

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role,
        regionId: regionId ? parseInt(regionId) : null,
        provinceId: provinceId ? parseInt(provinceId) : null,
        unitId: unitId ? parseInt(unitId) : null,
        isActive: isActive !== undefined ? isActive : true,
        genderBranch: genderBranch || null
      }
    })

    return NextResponse.json(newUser)
  } catch (error: any) {
    console.error('Kullanıcı oluşturulamadı:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanılıyor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Kullanıcı oluşturulurken bir hata oluştu' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
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

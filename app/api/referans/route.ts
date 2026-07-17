import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const [periods, units, activityTypes, provinces, regions] = await Promise.all([
    prisma.period.findMany({ orderBy: { startDate: 'desc' }, take: 20 }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' } }),
    prisma.province.findMany({ orderBy: { name: 'asc' }, include: { region: true } }),
    prisma.region.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ periods, units, activityTypes, provinces, regions })
}

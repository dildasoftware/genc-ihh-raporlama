import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canWrite } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import VeriGirisClient from './VeriGirisClient'

export const dynamic = 'force-dynamic'

export default async function VeriGirisPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user: SessionUser = {
    id: (session.user as any).id,
    role: (session.user as any).role,
    genderBranch: (session.user as any).genderBranch,
    provinceId: (session.user as any).provinceId,
    regionId: (session.user as any).regionId,
    unitId: (session.user as any).unitId,
    fullName: session.user.name ?? '',
  }

  if (!canWrite(user)) redirect('/panel')

  // Sunucu tarafında ilk verileri çek
  const [currentPeriod, institutions, activityTypes, units, provinces] = await Promise.all([
    prisma.period.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.institution.findMany({
      where: user.role === 'IL_KOORDINATOR'
        ? { provinceId: user.provinceId! }
        : {},
      include: {
        province: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' } }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
    // İl listesi (rapor verisi formu için)
    prisma.province.findMany({
      where: user.role === 'IL_KOORDINATOR'
        ? { id: user.provinceId! }
        : user.role === 'BOLGE_KOORDINATOR'
          ? { regionId: user.regionId! }
          : {},
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // Bu hafta kayıtlar
  const recentActivities = currentPeriod
    ? await prisma.activity.findMany({
        where: {
          createdBy: user.id,
          periodId: currentPeriod.id,
          deletedAt: null,
        },
        include: {
          institution: { include: { province: true } },
          activityType: true,
          faculty: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []

  const periods = await prisma.period.findMany({
    orderBy: { startDate: 'desc' },
    take: 10,
  })

  return (
    <VeriGirisClient
      user={user}
      currentPeriod={currentPeriod}
      periods={periods}
      institutions={institutions}
      activityTypes={activityTypes}
      units={units}
      recentActivities={recentActivities}
      provinces={provinces}
      currentYear={new Date().getFullYear()}
    />
  )
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import KesifClient from './KesifClient'

export const dynamic = 'force-dynamic'

export default async function KesifPage() {
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

  if (user.role === 'IL_KOORDINATOR') redirect('/panel')

  const [periods, units, activityTypes, provinces] = await Promise.all([
    prisma.period.findMany({ orderBy: { startDate: 'desc' }, take: 20 }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' } }),
    prisma.province.findMany({ orderBy: { name: 'asc' } }),
  ])

  // İlk yük: bu haftanın verisi
  const currentPeriod = await prisma.period.findFirst({
    where: { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    orderBy: { startDate: 'desc' },
  })

  const where = buildActivityFilter(user)
  if (currentPeriod) where.periodId = currentPeriod.id

  const activities = await prisma.activity.findMany({
    where,
    include: {
      institution: { include: { province: { include: { region: true } }, unit: true } },
      activityType: true,
    },
    take: 500,
  })

  // İl bazında gruplama
  const grouped: Record<string, { label: string; count: number; participants: number }> = {}
  for (const a of activities) {
    const key = a.institution.province?.name ?? 'Bilinmiyor'
    if (!grouped[key]) grouped[key] = { label: key, count: 0, participants: 0 }
    grouped[key].count++
    grouped[key].participants += a.participantCount
  }

  const initialData = {
    total: {
      count: activities.length,
      participants: activities.reduce((s, a) => s + a.participantCount, 0),
    },
    grouped: Object.entries(grouped)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.participants - a.participants),
  }

  return (
    <KesifClient
      user={user}
      periods={periods}
      units={units}
      activityTypes={activityTypes}
      provinces={provinces}
      currentPeriodId={currentPeriod?.id ?? null}
      initialData={initialData}
    />
  )
}

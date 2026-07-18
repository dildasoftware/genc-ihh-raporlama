import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope, type SessionUser } from '@/lib/authz'
import KarsilastirClient from './KarsilastirClient'

export const dynamic = 'force-dynamic'

export default async function KarsilastirPage() {
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

  const visible = await buildProvinceScope(user, prisma)
  const [provinces, units, activityTypes] = await Promise.all([
    prisma.province.findMany({
      where: visible === null ? {} : { id: { in: visible } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, region: { select: { name: true } } },
    }),
    prisma.unit.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <KarsilastirClient
      provinces={provinces.map((p: any) => ({ id: p.id, name: p.name, regionName: p.region.name }))}
      units={units}
      activityTypes={activityTypes}
      canFilterGender={true}
    />
  )
}

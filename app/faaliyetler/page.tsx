import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope, type SessionUser } from '@/lib/authz'
import FaaliyetlerClient from './FaaliyetlerClient'

export const dynamic = 'force-dynamic'

export default async function FaaliyetlerPage() {
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

  const visible = await buildProvinceScope(user, prisma)

  const [provinces, regions, units, activityTypes] = await Promise.all([
    prisma.province.findMany({
      where: visible === null ? {} : { id: { in: visible } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.region.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.unit.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <FaaliyetlerClient
      provinces={provinces}
      regions={regions}
      units={units}
      activityTypes={activityTypes}
      canFilterGender={user.role !== 'IL_KOORDINATOR'}
      canFilterRegion={user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI'}
    />
  )
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/authz'
import KarneClient from './KarneClient'

export const dynamic = 'force-dynamic'

export default async function KarnePage() {
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

  const year = new Date().getFullYear()
  const [units] = await Promise.all([
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
  ])

  return <KarneClient user={user} year={year} units={units} />
}

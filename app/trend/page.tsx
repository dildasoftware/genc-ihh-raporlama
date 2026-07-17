import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/authz'
import TrendClient from './TrendClient'

export const dynamic = 'force-dynamic'

export default async function TrendPage() {
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
  // Removed IL_KOORDINATOR restriction so they can analyze their own province

  const year = new Date().getFullYear()

  const [units, activityTypes] = await Promise.all([
    prisma.unit.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return <TrendClient user={user} year={year} units={units} activityTypes={activityTypes} />
}

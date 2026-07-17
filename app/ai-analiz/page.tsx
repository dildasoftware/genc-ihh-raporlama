import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/authz'
import AiAnalizClient from './AiAnalizClient'

export const dynamic = 'force-dynamic'

export default async function AiAnalizPage() {
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

  let regions = await prisma.region.findMany({ orderBy: { id: 'asc' } })
  let provinces = await prisma.province.findMany({ orderBy: { name: 'asc' } })

  if (user.role === 'BOLGE_KOORDINATOR' && user.regionId) {
    regions = regions.filter(r => r.id === user.regionId)
    provinces = provinces.filter(p => p.regionId === user.regionId)
  }

  return <AiAnalizClient user={user} regions={regions} provinces={provinces} />
}

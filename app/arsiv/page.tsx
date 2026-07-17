import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope, type SessionUser } from '@/lib/authz'
import ArsivClient from './ArsivClient'

export const dynamic = 'force-dynamic'

export default async function ArsivPage() {
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

  // İl filtresi yalnızca kullanıcının görebildiği illeri listeler
  const visible = await buildProvinceScope(user, prisma)
  const provinces = await prisma.province.findMany({
    where: visible === null ? {} : { id: { in: visible } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const currentYear = new Date().getFullYear()
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]

  return <ArsivClient provinces={provinces} years={years} />
}

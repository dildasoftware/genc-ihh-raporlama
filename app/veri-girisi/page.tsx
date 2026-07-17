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

  const now = new Date()

  const [currentPeriod, periods, provinces] = await Promise.all([
    prisma.period.findFirst({
      where: { startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { startDate: 'desc' },
    }),
    // Son 12 hafta — geriye dönük düzeltme yapılabilsin
    prisma.period.findMany({ orderBy: { startDate: 'desc' }, take: 12 }),
    prisma.province.findMany({
      where:
        user.role === 'IL_KOORDINATOR'
          ? { id: user.provinceId! }
          : {},
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <VeriGirisClient
      user={user}
      currentPeriod={currentPeriod}
      periods={periods}
      provinces={provinces}
      currentYear={now.getFullYear()}
    />
  )
}

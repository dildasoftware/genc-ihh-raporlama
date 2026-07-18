import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/authz'
import HaftalikRaporClient from './HaftalikRaporClient'

export const dynamic = 'force-dynamic'

export default async function HaftalikRaporPage() {
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

  const year = new Date().getFullYear()

  // Son 12 dönemi (haftayı) çek
  const periods = await prisma.period.findMany({
    where: { year },
    orderBy: { weekNo: 'desc' },
    take: 12,
  })

  const units = await prisma.unit.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true }
  })

  // Yetkiye göre bölge ve illeri getir
  let regions = await prisma.region.findMany({ orderBy: { id: 'asc' } })
  let provinces = await prisma.province.findMany({ orderBy: { name: 'asc' } })

  if (user.role === 'BOLGE_KOORDINATOR' && user.regionId) {
    regions = regions.filter((r: any) => r.id === user.regionId)
    provinces = provinces.filter((p: any) => p.regionId === user.regionId)
  }

  return <HaftalikRaporClient user={user} periods={periods} units={units} regions={regions} provinces={provinces} />
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/authz'
import IlBirimClient from './IlBirimClient'

export const dynamic = 'force-dynamic'

export default async function IlKarsilastirPage() {
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
  
  let provinces: any[] = []
  if (user.role === 'ADMIN' || user.role === 'MERKEZ_BIRIM_BASKANI') {
    provinces = await prisma.province.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
  } else if (user.role === 'BOLGE_KOORDINATOR') {
    provinces = await prisma.province.findMany({ where: { regionId: user.regionId! }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
  } else if (user.role === 'IL_KOORDINATOR') {
    provinces = await prisma.province.findMany({ where: { id: user.provinceId! }, select: { id: true, name: true } })
  }

  return <IlBirimClient user={user} year={year} provinces={provinces} />
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildProvinceScope, type SessionUser } from '@/lib/authz'
import KarneDetayClient from './KarneDetayClient'

export const dynamic = 'force-dynamic'

export default async function KarneDetayPage({
  params,
}: {
  params: Promise<{ provinceId: string }>
}) {
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

  const { provinceId: pidStr } = await params
  const provinceId = parseInt(pidStr)

  // Yetki: kullanıcı bu ili görebiliyor mu?
  const visible = await buildProvinceScope(user, prisma)
  if (visible !== null && !visible.includes(provinceId)) redirect('/karne')

  const [units, activityTypes] = await Promise.all([
    prisma.unit.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.activityType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <KarneDetayClient
      provinceId={provinceId}
      year={new Date().getFullYear()}
      units={units}
      activityTypes={activityTypes}
      canFilterGender={user.role !== 'IL_KOORDINATOR'}
    />
  )
}

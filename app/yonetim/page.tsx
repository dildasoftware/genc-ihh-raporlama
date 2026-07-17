import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { SessionUser } from '@/lib/authz'
import YonetimClient from './YonetimClient'

export const dynamic = 'force-dynamic'

export default async function YonetimPage() {
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

  if (user.role !== 'ADMIN' && user.role !== 'MERKEZ_BIRIM_BASKANI') redirect('/panel')

  return <YonetimClient />
}

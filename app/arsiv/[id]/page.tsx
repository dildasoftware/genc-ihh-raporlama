import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ArsivDetayClient from './ArsivDetayClient'

export const dynamic = 'force-dynamic'

export default async function ArsivDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { id } = await params

  // Yetki kontrolü API tarafında yapılır (kayıt hem Report hem AiInsight olabilir)
  return <ArsivDetayClient id={id} />
}

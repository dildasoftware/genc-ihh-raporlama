import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * İl Birim Analizi — ayrı bir ekran değil; ilin karne detayı bu ihtiyacı
 * kapsıyor (birim bazında katılım, faaliyet türü dağılımı, kurum kırılımı).
 * Boş bir kabuk tutmak yerine kullanıcıyı doğrudan kendi ilinin karnesine
 * yönlendiriyoruz. Admin il seçebilsin diye karne listesine gider.
 */
export default async function IlKarsilastirPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const provinceId = (session.user as any).provinceId as number | null
  redirect(provinceId ? `/karne/${provinceId}` : '/karne')
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { SessionUser } from '@/lib/authz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

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

  if (user.role !== 'IL_KOORDINATOR' && user.role !== 'ADMIN') redirect('/panel')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Building2 className="h-6 w-6 text-primary" />
        İl Birim Karşılaştırması
      </h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">İl Bazlı Birim Analizi</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bu ekranda ilinizin birimler bazında performansı karşılaştırılacak.
            AI Analiz ekranından &quot;İl Birim Analizi&quot; seçeneğini kullanabilirsiniz.
          </p>
          <a href="/ai-analiz" className="text-sm text-primary underline underline-offset-2 mt-4 block">
            AI İl Birim Analizi →
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

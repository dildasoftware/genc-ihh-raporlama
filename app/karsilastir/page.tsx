import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { SessionUser } from '@/lib/authz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KarsilastirPage() {
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <BarChart2 className="h-6 w-6 text-primary" />
        İller Arası Karşılaştırma
      </h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Çoklu İl Karşılaştırması</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bu ekran &quot;Keşif&quot; ekranından gruplama yapılarak veya &quot;AI Analiz&quot; karşılaştırma modundan ulaşılabilir.
          </p>
          <div className="flex gap-3 mt-4">
            <a href="/kesif" className="text-sm text-primary underline underline-offset-2">Keşif ekranına git →</a>
            <a href="/ai-analiz" className="text-sm text-primary underline underline-offset-2">AI Karşılaştırma →</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

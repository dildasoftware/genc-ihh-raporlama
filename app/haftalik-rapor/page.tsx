import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { SessionUser } from '@/lib/authz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

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

  if (user.role === 'IL_KOORDINATOR') redirect('/panel')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-primary" />
        Haftalık Rapor
      </h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Otomatik Haftalık Rapor Üretici</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bu ekran AI destekli haftalık rapor üretimine yönlendirilecek. Şu anda &quot;AI Analiz&quot; ekranından
            &quot;Haftalık Rapor&quot; seçeneğini kullanabilirsiniz.
          </p>
          <a href="/ai-analiz" className="text-sm text-primary underline underline-offset-2">
            AI Analiz ekranına git →
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

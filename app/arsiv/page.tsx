import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Archive } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ArsivPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Archive className="h-6 w-6 text-primary" />
        Arşiv
      </h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">PDF Arşivi</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Arşiv özelliği Faz 5&apos;te tamamlanacak. Dışa aktarılan PDF raporlar ve haftalık analiz arşivleri burada listelenecek.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

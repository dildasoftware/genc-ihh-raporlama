import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { SessionUser } from '@/lib/authz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

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

  if (user.role !== 'ADMIN') redirect('/panel')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        Yönetim Paneli
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Kullanıcı Yönetimi', desc: 'Kullanıcı ekleme, düzenleme ve rol ataması' },
          { title: 'Kurum Yönetimi', desc: 'Kurum, fakülte ve birim yönetimi' },
          { title: 'Dönem Yönetimi', desc: 'Haftalık dönem tanımları ve takvim' },
          { title: 'Puan Ağırlıkları', desc: 'Birim & faaliyet türü ağırlık ayarları' },
          { title: 'AI Analiz Geçmişi', desc: 'Tüm kullanıcıların AI kullanım geçmişi' },
          { title: 'Denetim Kaydı', desc: 'Sistem olayları ve değişiklik logları' },
        ].map(({ title, desc }) => (
          <Card key={title} className="border-border/60 hover:border-primary/30 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{desc}</p>
              <p className="text-xs text-primary mt-2">Faz 5&apos;te aktif olacak →</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildActivityFilter } from '@/lib/authz'
import { callAI } from '@/lib/ai'
import type { SessionUser } from '@/lib/authz'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const user: SessionUser = {
    id: (session.user as any).id,
    role: (session.user as any).role,
    genderBranch: (session.user as any).genderBranch,
    provinceId: (session.user as any).provinceId,
    regionId: (session.user as any).regionId,
    unitId: (session.user as any).unitId,
    fullName: session.user.name ?? '',
  }

  const body = await request.json()
  const { scopeType, scopeId, timeframe, year, month, weekNo } = body

  if (!scopeType || !timeframe || !year) {
    return NextResponse.json({ error: 'Eksik parametreler (scopeType, timeframe, year)' }, { status: 400 })
  }

  // Base scope based on user permissions
  const where = buildActivityFilter(user, 'ALL')

  // Apply requested filters
  if (scopeType === 'PROVINCE' && scopeId) {
    where.institution = { ...where.institution, provinceId: parseInt(scopeId) }
  } else if (scopeType === 'REGION' && scopeId) {
    where.institution = { ...where.institution, province: { regionId: parseInt(scopeId) } }
  }

  // Timeframe filtering
  where.period = { year: parseInt(year) }
  if (timeframe === 'MONTHLY' && month) {
    where.period.month = parseInt(month)
  } else if (timeframe === 'WEEKLY' && weekNo) {
    where.period.weekNo = parseInt(weekNo)
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      activityType: true,
      institution: { include: { unit: true, province: true } },
    }
  })

  // Aggregate Data
  let totalParticipants = 0
  let totalActivities = activities.length
  const unitMap = new Map<string, number>()
  const activityTypeMap = new Map<string, number>()
  
  // To get the name of the province/region for the report title
  let scopeName = 'Türkiye Geneli'
  if (scopeType === 'PROVINCE' && scopeId) {
    const prov = await prisma.province.findUnique({ where: { id: parseInt(scopeId) } })
    if (prov) scopeName = prov.name
  } else if (scopeType === 'REGION' && scopeId) {
    const reg = await prisma.region.findUnique({ where: { id: parseInt(scopeId) } })
    if (reg) scopeName = `${reg.name} Bölge`
  }

  activities.forEach(a => {
    totalParticipants += a.participantCount
    const unitName = a.institution.unit.name
    unitMap.set(unitName, (unitMap.get(unitName) || 0) + a.participantCount)
    activityTypeMap.set(a.activityType.name, (activityTypeMap.get(a.activityType.name) || 0) + a.participantCount)
  })

  const unitStats = Array.from(unitMap.entries()).map(([k, v]) => `${k}: ${v} katılımcı`).join('\n')
  const activityStats = Array.from(activityTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => `${k}: ${v} katılımcı`)
    .join('\n')

  let titleTimeframe = `${year} Yılı`
  if (timeframe === 'MONTHLY') titleTimeframe = `${year} Yılı ${month}. Ay`
  if (timeframe === 'WEEKLY') titleTimeframe = `${year} Yılı ${weekNo}. Hafta`

  const title = `${scopeName} - ${titleTimeframe} Akıllı Karne Raporu`

  const systemPrompt = `
Sen GENÇ İHH Raporlama Sistemi'nin kıdemli veri analisti ve raporlama uzmanısın.
Sana bir bölgenin veya ilin (${scopeName}) belirli bir zaman dilimindeki (${titleTimeframe}) faaliyet verilerinin özeti verilecek.
Görevin bu verileri inceleyip profesyonel, yapıcı ve stratejik bir "Akıllı Karne / AI Analiz Raporu" oluşturmak.

Rapor Formatı (Markdown kullan):
1. **Yönetici Özeti**: Performansın genel bir değerlendirmesi (kısa bir paragraf).
2. **Güçlü Yönler**: Hangi birimler veya faaliyet türleri çok başarılı? Neden?
3. **Gelişime Açık Yönler (Zayıf Yönler)**: Sayısal olarak düşük kalan veya ihmal edilmiş alanlar nelerdir?
4. **Stratejik Öneriler**: Bir sonraki dönem (hafta/ay/yıl) için performansın nasıl artırılabileceğine dair aksiyon odaklı somut 3 öneri.

Ton: Cesaretlendirici, profesyonel, nesnel ve çözüm odaklı ol.
Lütfen çok uzun cümlelerden kaçın ve kolay okunabilir bir yapı kullan.
`

  const userPrompt = `
Kapsam: ${scopeName}
Zaman Aralığı: ${titleTimeframe}
Toplam Faaliyet Sayısı: ${totalActivities}
Toplam Katılımcı Sayısı: ${totalParticipants}

Birim Bazlı Dağılım:
${unitStats || 'Veri yok'}

En Çok Yapılan Faaliyetler:
${activityStats || 'Veri yok'}

Lütfen yukarıdaki verilere göre Akıllı Karne analizini oluştur.
`

  try {
    const aiResponse = await callAI(systemPrompt, userPrompt, 1500)

    const aiInsight = await prisma.aiInsight.create({
      data: {
        type: 'SMART_KARNE',
        scopeType,
        scopeId: scopeId ? parseInt(scopeId) : null,
        scopeName,
        title,
        year: parseInt(year),
        prompt: userPrompt,
        response: aiResponse,
        generatedBy: user.id,
      }
    })

    return NextResponse.json(aiInsight)
  } catch (error: any) {
    console.error('AI Smart Report Error:', error)
    return NextResponse.json({ error: error.message || 'AI Raporu oluşturulamadı' }, { status: 500 })
  }
}

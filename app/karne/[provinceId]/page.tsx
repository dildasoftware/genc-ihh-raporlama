import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import KarneDetayClient from './KarneDetayClient'

export const dynamic = 'force-dynamic'

export default async function KarneDetayPage({ params }: { params: Promise<{ provinceId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { provinceId: pidStr } = await params
  const provinceId = parseInt(pidStr)
  const year = new Date().getFullYear()

  const [province, report, activities, units] = await Promise.all([
    prisma.province.findUnique({
      where: { id: provinceId },
      include: { region: true },
    }),
    prisma.provinceReport.findUnique({
      where: { provinceId_year: { provinceId, year } },
    }),
    prisma.activity.findMany({
      where: {
        institution: { provinceId },
        deletedAt: null,
      },
      include: {
        institution: { include: { unit: true } },
        activityType: true,
      },
    }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
  ])

  if (!province) redirect('/karne')

  // Birim bazlı istatistikler hesapla (activity verilerinden)
  const unitStats: Record<string, { count: number; participants: number; score: number }> = {}
  for (const u of units) {
    unitStats[u.name] = { count: 0, participants: 0, score: 0 }
  }
  for (const act of activities) {
    const unitName = act.institution.unit.name
    if (unitStats[unitName]) {
      unitStats[unitName].count++
      unitStats[unitName].participants += act.participantCount
      unitStats[unitName].score += act.participantCount * 0.5 // basit skor
    }
  }

  return (
    <KarneDetayClient
      province={province}
      report={report}
      unitStats={unitStats}
      year={year}
    />
  )
}

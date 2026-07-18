/**
 * Karne veri toplama — liste ve detay route'larının ortak kaynağı.
 * Tek yerde toplanır ki sıralama ile detay asla çelişmesin.
 */

import { prisma } from '@/lib/prisma'
import {
  computeKarne, computeMaxima, buildInsights,
  type ProvinceMetrics, type KarneResult, type Insight,
} from '@/lib/karne'

const ORG_POSITION_COUNT = 12

export interface KarneFilters {
  year: number
  month?: number | null
  gender?: 'K' | 'E' | 'ALL' | null
  unitId?: string | null
  regionId?: string | null
  activityTypeId?: string | null
  weekFrom?: string | null
  weekTo?: string | null
}

export interface UnitBreakdown {
  score: number
  count: number
  participants: number
  institutionCount: number
}

export interface RankedProvince {
  provinceId: number
  provinceName: string
  regionName: string
  rank: number
  total: number
  grade: KarneResult['grade']
  scores: KarneResult['scores']
  weightedScore: number
  totalParticipants: number
  totalActivities: number
  institutionCount: number
  activeWeeks: number
  totalWeeks: number
  orgFilled: number
  orgTotal: number
  byUnit: Record<string, UnitBreakdown>
  byActivityType: Record<string, { count: number; participants: number }>
  byWeek: Record<number, { participants: number; activities: number }>
  byMonth: Record<number, number>
  insights: Insight[]
}

/** Kurum kırılımı — "Hangi üniversitede kaç kişi" detayı */
export interface InstitutionDetail {
  name: string
  unitName: string
  schoolType: string | null
  totalParticipants: number
  activities: { type: string; participants: number; occurrences: number; faculties: string[] }[]
}

/**
 * Karne DAİMA ulusal olarak hesaplanır — bir ilin sırası ancak tüm illerle
 * kıyaslanınca anlamlıdır. Kullanıcının neyi göreceği (il/bölge kısıtı)
 * çağıran route'ta uygulanır; sıralama numarası ulusal kalır.
 */
export async function loadKarne(f: KarneFilters) {
  // ── Dönemler ──
  const periods = await prisma.period.findMany({
    where: {
      year: f.year,
      ...(f.month ? { month: f.month } : {}),
      ...(f.weekFrom || f.weekTo
        ? {
            weekNo: {
              ...(f.weekFrom ? { gte: parseInt(f.weekFrom) } : {}),
              ...(f.weekTo ? { lte: parseInt(f.weekTo) } : {}),
            },
          }
        : {}),
    },
    select: { id: true, weekNo: true, month: true },
    orderBy: { weekNo: 'asc' },
  })
  const periodIds = periods.map((p: any) => p.id)
  const periodById = new Map(periods.map(p => [p.id, p]))

  // ── Filtre ──
  const where: any = {
    deletedAt: null,
    periodId: periodIds.length > 0 ? { in: periodIds } : { in: [-1] },
  }
  if (f.gender && f.gender !== 'ALL') where.genderBranch = f.gender

  const instFilter: any = {}
  if (f.unitId) instFilter.unitId = parseInt(f.unitId)
  if (f.regionId) instFilter.province = { regionId: parseInt(f.regionId) }
  if (Object.keys(instFilter).length > 0) where.institution = instFilter
  if (f.activityTypeId) where.activityTypeId = parseInt(f.activityTypeId)

  const [activities, weights, reports] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        institution: {
          include: { province: { include: { region: true } }, unit: true, schoolType: true },
        },
        activityType: true,
        faculty: true,
      },
    }),
    prisma.scoreWeight.findMany(),
    prisma.provinceReport.findMany({ where: { year: f.year } }),
  ])

  const weightMap = new Map(weights.map(w => [`${w.unitId}-${w.activityTypeId}`, w.weight]))
  const reportMap = new Map(reports.map(r => [r.provinceId, r]))

  interface Acc extends ProvinceMetrics {
    byUnit: Record<string, { score: number; count: number; participants: number; institutions: Set<string> }>
    byActivityType: Record<string, { count: number; participants: number }>
    byWeek: Record<number, { participants: number; activities: number }>
    byMonth: Record<number, number>
    institutionSet: Set<string>
    weekSet: Set<number>
    /** kurum adı → detay */
    institutions: Map<string, InstitutionDetail & { _types: Map<string, { participants: number; occurrences: number; faculties: Set<string> }> }>
  }

  const acc = new Map<number, Acc>()

  for (const a of activities) {
    const inst = a.institution
    const pid = inst.provinceId
    if (!pid) continue

    if (!acc.has(pid)) {
      const report = reportMap.get(pid)
      const org = (report?.orgStatus ?? {}) as Record<string, boolean>
      acc.set(pid, {
        provinceId: pid,
        provinceName: inst.province?.name ?? '',
        regionName: inst.province?.region?.name ?? '',
        weightedScore: 0,
        totalParticipants: 0,
        totalActivities: 0,
        institutionCount: 0,
        activeWeeks: 0,
        totalWeeks: periods.length,
        orgFilled: Object.values(org).filter(Boolean).length,
        orgTotal: ORG_POSITION_COUNT,
        activeDistricts: report?.gencIhhDistrictCount ?? 0,
        totalDistricts: report?.totalDistrictCount ?? 0,
        byUnit: {},
        byActivityType: {},
        byWeek: {},
        byMonth: {},
        institutionSet: new Set(),
        weekSet: new Set(),
        institutions: new Map(),
      })
    }

    const e = acc.get(pid)!
    const unitName = inst.unit?.name ?? 'Diğer'
    const atName = a.activityType.name
    const weight = weightMap.get(`${inst.unitId}-${a.activityTypeId}`) ?? 1
    const score = a.participantCount * weight

    e.weightedScore += score
    e.totalParticipants += a.participantCount
    e.totalActivities++
    e.institutionSet.add(`${unitName}::${inst.name}`)

    if (!e.byUnit[unitName]) {
      e.byUnit[unitName] = { score: 0, count: 0, participants: 0, institutions: new Set() }
    }
    e.byUnit[unitName].score += score
    e.byUnit[unitName].count++
    e.byUnit[unitName].participants += a.participantCount
    e.byUnit[unitName].institutions.add(inst.name)

    if (!e.byActivityType[atName]) e.byActivityType[atName] = { count: 0, participants: 0 }
    e.byActivityType[atName].count++
    e.byActivityType[atName].participants += a.participantCount

    // Kurum kırılımı
    const key = `${unitName}::${inst.name}`
    if (!e.institutions.has(key)) {
      e.institutions.set(key, {
        name: inst.name,
        unitName,
        schoolType: inst.schoolType?.name ?? null,
        totalParticipants: 0,
        activities: [],
        _types: new Map(),
      })
    }
    const det = e.institutions.get(key)!
    det.totalParticipants += a.participantCount
    if (!det._types.has(atName)) {
      det._types.set(atName, { participants: 0, occurrences: 0, faculties: new Set() })
    }
    const t = det._types.get(atName)!
    t.participants += a.participantCount
    t.occurrences++
    if (a.faculty?.name) t.faculties.add(a.faculty.name)

    const period = periodById.get(a.periodId)
    if (period) {
      e.weekSet.add(period.weekNo)
      if (!e.byWeek[period.weekNo]) e.byWeek[period.weekNo] = { participants: 0, activities: 0 }
      e.byWeek[period.weekNo].participants += a.participantCount
      e.byWeek[period.weekNo].activities++
      e.byMonth[period.month] = (e.byMonth[period.month] ?? 0) + score
    }
  }

  for (const e of acc.values()) {
    e.institutionCount = e.institutionSet.size
    e.activeWeeks = e.weekSet.size
    for (const det of e.institutions.values()) {
      det.activities = [...det._types.entries()]
        .map(([type, v]) => ({
          type,
          participants: v.participants,
          occurrences: v.occurrences,
          faculties: [...v.faculties],
        }))
        .sort((a, b) => b.participants - a.participants)
    }
  }

  const metrics = [...acc.values()]
  const maxima = computeMaxima(metrics)

  const scored = metrics
    .map(m => ({ m, karne: computeKarne(m, maxima) }))
    .sort((a, b) => b.karne.total - a.karne.total)

  const ranked: RankedProvince[] = scored.map(({ m, karne }, i) => {
    const e = acc.get(m.provinceId)!
    return {
      provinceId: m.provinceId,
      provinceName: m.provinceName,
      regionName: m.regionName,
      rank: i + 1,
      total: karne.total,
      grade: karne.grade,
      scores: karne.scores,
      weightedScore: Math.round(m.weightedScore),
      totalParticipants: m.totalParticipants,
      totalActivities: m.totalActivities,
      institutionCount: m.institutionCount,
      activeWeeks: m.activeWeeks,
      totalWeeks: m.totalWeeks,
      orgFilled: m.orgFilled,
      orgTotal: m.orgTotal,
      byUnit: Object.fromEntries(
        Object.entries(e.byUnit).map(([k, v]) => [
          k,
          { score: Math.round(v.score), count: v.count, participants: v.participants, institutionCount: v.institutions.size },
        ])
      ),
      byActivityType: e.byActivityType,
      byWeek: e.byWeek,
      byMonth: e.byMonth,
      insights: buildInsights(m, karne, i + 1, metrics.length),
    }
  })

  const summary = {
    provinceCount: ranked.length,
    totalParticipants: metrics.reduce((s, m) => s + m.totalParticipants, 0),
    totalActivities: metrics.reduce((s, m) => s + m.totalActivities, 0),
    institutionCount: metrics.reduce((s, m) => s + m.institutionCount, 0),
    avgScore: ranked.length
      ? Math.round((ranked.reduce((s, r) => s + r.total, 0) / ranked.length) * 10) / 10
      : 0,
  }

  /** Bir ilin kurum kırılımını döndürür */
  const institutionsOf = (provinceId: number): InstitutionDetail[] => {
    const e = acc.get(provinceId)
    if (!e) return []
    return [...e.institutions.values()]
      // _types iç hesaplama alanı — dışarı sızmasın diye ayıklanıyor
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _types, ...rest }) => rest)
      .sort((a, b) => b.totalParticipants - a.totalParticipants)
  }

  /** Tüm Türkiye kurum kırılımını döndürür (En iyi 200) */
  const allInstitutions = (): InstitutionDetail[] => {
    const all = []
    for (const e of acc.values()) {
      all.push(...e.institutions.values())
    }
    return all
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _types, ...rest }) => rest)
      .sort((a, b) => b.totalParticipants - a.totalParticipants)
      .slice(0, 200)
  }

  return { periods, ranked, summary, institutionsOf, allInstitutions, reportMap }
}

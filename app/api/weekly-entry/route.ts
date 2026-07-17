import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QUESTIONS, getQuestion, UNIT_BY_KEY, type AnswerRow, type Answers } from '@/lib/questions'
import type { GenderBranch } from '@prisma/client'

/**
 * Haftalık Soru Formu API
 *
 * Formdaki her kurum satırı ("Hacı Bayram Veli Üni. → 12 kişi") tek bir
 * Activity kaydına dönüşür. Böylece karne / trend / filtreler hepsi aynı
 * normalize veriden beslenir — JSON blob yok, detay kaybı yok.
 */

function sessionUser(session: any) {
  return {
    id: session.user.id as string,
    role: session.user.role as string,
    genderBranch: session.user.genderBranch as GenderBranch | null,
    provinceId: session.user.provinceId as number | null,
  }
}

/** İl koordinatörü sadece kendi ilini, kendi kolunu yazabilir */
function resolveScope(
  user: ReturnType<typeof sessionUser>,
  reqProvinceId: number,
  reqGender: string | null
): { provinceId: number; gender: GenderBranch } | { error: string; status: number } {
  if (user.role === 'IL_KOORDINATOR') {
    if (!user.provinceId) return { error: 'Kullanıcıya il atanmamış', status: 400 }
    if (reqProvinceId && reqProvinceId !== user.provinceId) {
      return { error: 'Bu il için yetkiniz yok', status: 403 }
    }
    if (!user.genderBranch) return { error: 'Kullanıcıya kol atanmamış', status: 400 }
    return { provinceId: user.provinceId, gender: user.genderBranch }
  }

  if (user.role === 'ADMIN') {
    if (!reqProvinceId) return { error: 'provinceId gerekli', status: 400 }
    if (reqGender !== 'K' && reqGender !== 'E') {
      return { error: 'gender (K/E) gerekli', status: 400 }
    }
    return { provinceId: reqProvinceId, gender: reqGender }
  }

  return { error: 'Veri girişi yetkiniz yok', status: 403 }
}

// ==================== GET — mevcut haftanın cevaplarını yükle ====================

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const { searchParams } = new URL(request.url)
  const periodId = parseInt(searchParams.get('periodId') || '0')
  const reqProvinceId = parseInt(searchParams.get('provinceId') || '0')
  const reqGender = searchParams.get('gender')

  if (!periodId) return NextResponse.json({ error: 'periodId gerekli' }, { status: 400 })

  const scope = resolveScope(user, reqProvinceId, reqGender)
  if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: scope.status })

  const activities = await prisma.activity.findMany({
    where: {
      periodId,
      genderBranch: scope.gender,
      deletedAt: null,
      institution: { provinceId: scope.provinceId },
    },
    include: {
      institution: { include: { unit: true, schoolType: true } },
      activityType: true,
      faculty: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Activity kayıtlarını soru cevaplarına geri çevir
  const answers: Answers = {}
  for (const a of activities) {
    const unitName = a.institution.unit?.name
    const question = QUESTIONS.find(
      q => q.unitName === unitName && q.activityType === a.activityType.name
    )
    if (!question) continue

    if (!answers[question.id]) answers[question.id] = []
    answers[question.id].push({
      id: a.id,
      institutionName: a.institution.name,
      participantCount: a.participantCount,
      schoolType: a.institution.schoolType?.name,
      facultyName: a.faculty?.name,
      note: a.note ?? undefined,
    })
  }

  return NextResponse.json({
    periodId,
    provinceId: scope.provinceId,
    gender: scope.gender,
    answers,
  })
}

// ==================== POST — haftalık raporu kaydet ====================

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = sessionUser(session)

  const body = await request.json()
  const { periodId, answers } = body as { periodId: number; answers: Answers }

  if (!periodId) return NextResponse.json({ error: 'periodId gerekli' }, { status: 400 })

  const scope = resolveScope(user, body.provinceId ?? 0, body.gender ?? null)
  if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: scope.status })

  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })

  const province = await prisma.province.findUnique({ where: { id: scope.provinceId } })
  if (!province) return NextResponse.json({ error: 'İl bulunamadı' }, { status: 404 })

  try {
    // ── Referansları çöz (unit / activityType / schoolType) ──
    const [units, activityTypes, schoolTypes] = await Promise.all([
      prisma.unit.findMany(),
      prisma.activityType.findMany(),
      prisma.schoolType.findMany(),
    ])
    const unitByName = new Map(units.map(u => [u.name, u]))
    const atByName = new Map(activityTypes.map(a => [a.name, a]))
    const stByName = new Map(schoolTypes.map(s => [s.name, s]))

    // ── Satırları Activity kayıtlarına dönüştür ──
    type PendingActivity = {
      institutionId: number
      facultyId: number | null
      activityTypeId: number
      participantCount: number
      location: string
      note: string | null
    }
    const pending: PendingActivity[] = []

    for (const [questionId, rows] of Object.entries(answers ?? {})) {
      const question = getQuestion(questionId)
      if (!question) continue

      const unit = unitByName.get(question.unitName)
      const activityType = atByName.get(question.activityType)
      if (!unit || !activityType) {
        return NextResponse.json(
          { error: `Referans eksik: ${question.unitName} / ${question.activityType}. Seed çalıştırılmalı.` },
          { status: 500 }
        )
      }

      for (const row of rows ?? []) {
        // Yönetim toplantısının kurumu yoktur — ilin kendi yönetimi
        const rawName = question.isManagement
          ? `${province.name} İl Yönetimi`
          : row.institutionName?.trim()

        if (!rawName) continue
        if (!row.participantCount || row.participantCount < 1) continue

        // Kurumu bul ya da oluştur (aynı il + birim + isim = aynı kurum)
        let institution = await prisma.institution.findFirst({
          where: { provinceId: scope.provinceId, unitId: unit.id, name: rawName },
        })

        const schoolTypeId = row.schoolType ? stByName.get(row.schoolType)?.id ?? null : null

        if (!institution) {
          // Serbest metin kapalı birimlerde (üniversite → resmî YÖK listesi)
          // yeni kurum UYDURULAMAZ. İstemci doğrulaması atlanırsa burada durur.
          const unitDef = UNIT_BY_KEY[question.unitKey]
          if (!unitDef.allowFreeText && !question.isManagement) {
            return NextResponse.json(
              {
                error: `"${rawName}" resmî ${unitDef.label.toLowerCase()} listesinde yok. ` +
                       `${unitDef.label} adı listeden seçilmelidir.`,
              },
              { status: 400 }
            )
          }

          institution = await prisma.institution.create({
            data: {
              provinceId: scope.provinceId,
              unitId: unit.id,
              name: rawName,
              schoolTypeId,
            },
          })
        } else if (schoolTypeId && institution.schoolTypeId !== schoolTypeId) {
          institution = await prisma.institution.update({
            where: { id: institution.id },
            data: { schoolTypeId },
          })
        }

        // Fakülte (sadece üniversite)
        let facultyId: number | null = null
        const facultyName = row.facultyName?.trim()
        if (facultyName) {
          let faculty = await prisma.faculty.findFirst({
            where: { institutionId: institution.id, name: facultyName },
          })
          if (!faculty) {
            faculty = await prisma.faculty.create({
              data: { institutionId: institution.id, name: facultyName },
            })
          }
          facultyId = faculty.id
        }

        pending.push({
          institutionId: institution.id,
          facultyId,
          activityTypeId: activityType.id,
          participantCount: row.participantCount,
          location: rawName,
          note: row.note?.trim() || null,
        })
      }
    }

    // ── Bu hafta + il + kol kapsamındaki eski kayıtları değiştir ──
    // Form o haftanın TAM raporunu temsil ediyor; kısmi kayıt yok.
    const provinceInstitutions = await prisma.institution.findMany({
      where: { provinceId: scope.provinceId },
      select: { id: true },
    })
    const institutionIds = provinceInstitutions.map(i => i.id)

    const result = await prisma.$transaction(async tx => {
      const deleted = await tx.activity.deleteMany({
        where: {
          periodId,
          genderBranch: scope.gender,
          institutionId: { in: institutionIds },
        },
      })

      let created = 0
      if (pending.length > 0) {
        const res = await tx.activity.createMany({
          data: pending.map(p => ({
            periodId,
            institutionId: p.institutionId,
            facultyId: p.facultyId,
            activityTypeId: p.activityTypeId,
            participantCount: p.participantCount,
            genderBranch: scope.gender,
            location: p.location,
            note: p.note,
            createdBy: user.id,
          })),
        })
        created = res.count
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'HAFTALIK_RAPOR_KAYDET',
          entity: 'Activity',
          entityId: `${periodId}-${scope.provinceId}-${scope.gender}`,
          metaJson: JSON.stringify({
            periodId,
            provinceId: scope.provinceId,
            gender: scope.gender,
            silinen: deleted.count,
            eklenen: created,
          }),
        },
      })

      return { deleted: deleted.count, created }
    })

    return NextResponse.json({
      ok: true,
      periodId,
      provinceId: scope.provinceId,
      gender: scope.gender,
      ...result,
    })
  } catch (err: any) {
    console.error('Haftalık rapor kayıt hatası:', err)
    return NextResponse.json({ error: 'Kayıt başarısız: ' + err.message }, { status: 500 })
  }
}

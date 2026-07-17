/**
 * Zengin demo veri üreticisi — uzun dönem gerçek kullanım simülasyonu.
 *
 * Çalıştırma:  npx tsx prisma/demo-data.ts
 *
 * Ne üretir:
 *  - 12 il (7 bölgenin hepsinden), her biri farklı "güç" profiliyle
 *  - Mevcut 13 haftanın her biri × 2 kol için faaliyet kayıtları
 *  - Resmî YÖK üniversiteleri (lib/universities) + il başına okul/ortaokul/çocuk birimi
 *  - Üniversite faaliyetlerinde fakülte kırılımı
 *  - Her il için il künyesi (ProvinceReport: teşkilat, ilçe, hedefler)
 *
 * Deterministiktir (sabit tohumlu RNG): her çalıştırmada aynı veri çıkar.
 * TÜM mevcut faaliyetleri silip yeniden üretir — demo sistem içindir.
 * Arşivdeki rapor snapshot'ları etkilenmez (bağımsız saklanırlar).
 */

import { config } from 'dotenv'
import { PrismaClient, GenderBranch } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { universitiesOfProvince } from '../lib/universities'
import { lisesOfProvince, ortaokulsOfProvince } from '../lib/schools'

// .env yerel Prisma dev adresi taşıyor; gerçek Neon adresi .env.local'da.
// override:true olmadan .env kazanır ve bağlantı reddedilir.
config({ path: '.env.local', override: true })

const DISTRICTS_MAP: Record<string, string[]> = {
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar'],
  'İstanbul': ['Fatih', 'Üsküdar', 'Kadıköy', 'Pendik', 'Ümraniye', 'Esenyurt', 'Bağcılar', 'Beşiktaş'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya'],
  'İzmir': ['Konak', 'Karşıyaka', 'Buca', 'Bornova', 'Bayraklı', 'Çiğli'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Gölcük', 'Körfez', 'Kartepe'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'Develi'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Araklı', 'Of'],
  'Samsun': ['İlkadım', 'Atakum', 'Bafra', 'Çarşamba'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş']
}

const NAME_SAMPLES = {
  first: ['Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hüseyin', 'Zeynep', 'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Ömer', 'Yusuf', 'Ebru', 'Seda', 'Merve', 'Elif', 'Esra', 'Tarık', 'Burak', 'Hakan'],
  last: ['Yılmaz', 'Demir', 'Kaya', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Aslan', 'Kılıç', 'Arslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir']
}

function getRandomName(randFn: () => number) {
  const f = NAME_SAMPLES.first[Math.floor(randFn() * NAME_SAMPLES.first.length)]
  const l = NAME_SAMPLES.last[Math.floor(randFn() * NAME_SAMPLES.last.length)]
  return `${f} ${l}`
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ Geçerli DATABASE_URL bulunamadı (.env.local beklenir)')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// ── Deterministik RNG (mulberry32) ──
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260717)
const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1))
const chance = (p: number) => rand() < p

/**
 * İl profilleri — "güç" 0..1: haftalık rapor girme olasılığı ve katılım
 * hacmini belirler. Kasıtlı olarak çeşitli: güçlü/orta/zayıf iller olsun ki
 * karne sıralaması, karşılaştırma ve tespitler anlamlı görünsün.
 */
const PROFILES: { name: string; strength: number }[] = [
  { name: 'Ankara', strength: 0.95 },
  { name: 'İstanbul', strength: 0.9 },
  { name: 'Konya', strength: 0.8 },
  { name: 'Bursa', strength: 0.75 },
  { name: 'İzmir', strength: 0.7 },
  { name: 'Kocaeli', strength: 0.65 },
  { name: 'Gaziantep', strength: 0.6 },
  { name: 'Kayseri', strength: 0.55 },
  { name: 'Trabzon', strength: 0.5 },
  { name: 'Samsun', strength: 0.45 },
  { name: 'Erzurum', strength: 0.4 },
  { name: 'Van', strength: 0.3 },
]

const FACULTY_NAMES = [
  'Hukuk Fakültesi', 'Mühendislik Fakültesi', 'Tıp Fakültesi',
  'İktisadi ve İdari Bilimler', 'İlahiyat Fakültesi', 'Eğitim Fakültesi',
]

async function main() {
  console.log('🎬 Demo veri üretimi başlıyor…')

  const [provinces, units, schoolTypes, activityTypes, periods, users] = await Promise.all([
    prisma.province.findMany(),
    prisma.unit.findMany(),
    prisma.schoolType.findMany(),
    prisma.activityType.findMany(),
    prisma.period.findMany({ orderBy: { weekNo: 'asc' } }),
    prisma.user.findMany(),
  ])

  const provinceByName = new Map(provinces.map(p => [p.name, p]))
  const unitByName = new Map(units.map(u => [u.name, u]))
  const stByName = new Map(schoolTypes.map(s => [s.name, s]))
  const atByName = new Map(activityTypes.map(a => [a.name, a]))
  const admin = users.find(u => u.email === 'admin@test.com')
  if (!admin) throw new Error('admin@test.com bulunamadı — önce seed çalıştırın')
  const ankaraK = users.find(u => u.email === 'ankara-k@test.com') ?? admin
  const ankaraE = users.find(u => u.email === 'ankara-e@test.com') ?? admin

  // ── Temizle: tüm faaliyetler yeniden üretilir ──
  const del = await prisma.activity.deleteMany({})
  const delR = await prisma.report.deleteMany({})
  const delAi = await prisma.aiInsight.deleteMany({})
  console.log(`🧹 ${del.count} eski faaliyet, ${delR.count} eski rapor ve ${delAi.count} eski AI analizi silindi`)

  const year = periods[0]?.year ?? new Date().getFullYear()
  let totalActivities = 0

  for (const profile of PROFILES) {
    const province = provinceByName.get(profile.name)
    if (!province) { console.warn(`⚠️  İl yok: ${profile.name}`); continue }
    const s = profile.strength

    // ── Kurumlar ──
    // Üniversiteler: resmî listeden ilk 2-4 tanesi
    const officialUnis = universitiesOfProvince(profile.name).slice(0, s > 0.7 ? 4 : s > 0.5 ? 3 : 2)
    const uniIds: { id: number; faculties: number[] }[] = []
    for (const uni of officialUnis) {
      let inst = await prisma.institution.findFirst({
        where: { name: uni.name, provinceId: province.id, unitId: unitByName.get('Üniversite')!.id },
      })
      if (!inst) {
        inst = await prisma.institution.create({
          data: { name: uni.name, provinceId: province.id, unitId: unitByName.get('Üniversite')!.id },
        })
      }
      // 2-3 fakülte
      const facIds: number[] = []
      for (const fname of FACULTY_NAMES.slice(0, between(2, 3))) {
        let fac = await prisma.faculty.findFirst({ where: { institutionId: inst.id, name: fname } })
        if (!fac) fac = await prisma.faculty.create({ data: { institutionId: inst.id, name: fname } })
        facIds.push(fac.id)
      }
      uniIds.push({ id: inst.id, faculties: facIds })
    }

    // Liseler / ortaokullar / çocuk birimleri / il yönetimi
    async function ensureInst(name: string, unitName: string, schoolType?: string) {
      const unit = unitByName.get(unitName)!
      let inst = await prisma.institution.findFirst({
        where: { name, provinceId: province!.id, unitId: unit.id },
      })
      if (!inst) {
        inst = await prisma.institution.create({
          data: {
            name, provinceId: province!.id, unitId: unit.id,
            schoolTypeId: schoolType ? stByName.get(schoolType)?.id ?? null : null,
          },
        })
      }
      return inst.id
    }

    const liseEntries = lisesOfProvince(profile.name)
    const liseIds: number[] = []
    for (const l of liseEntries) {
      liseIds.push(await ensureInst(l.name, 'Lise', l.schoolType))
    }
    if (liseIds.length === 0) {
      liseIds.push(await ensureInst(`${profile.name} Fen Lisesi`, 'Lise', 'Fen Lisesi'))
      liseIds.push(await ensureInst(`${profile.name} Anadolu İmam Hatip Lisesi`, 'Lise', 'İHL'))
      liseIds.push(await ensureInst(`${profile.name} Anadolu Lisesi`, 'Lise', 'Anadolu Lisesi'))
    }

    const ortaokulEntries = ortaokulsOfProvince(profile.name)
    const ortaokulIds: number[] = []
    for (const o of ortaokulEntries) {
      ortaokulIds.push(await ensureInst(o.name, 'Ortaokul'))
    }
    if (ortaokulIds.length === 0) {
      ortaokulIds.push(await ensureInst(`${profile.name} Fatih Ortaokulu`, 'Ortaokul'))
      ortaokulIds.push(await ensureInst(`${profile.name} Atatürk Ortaokulu`, 'Ortaokul'))
    }

    const cocukIds = [await ensureInst(`${profile.name} Çocuk Kulübü`, 'Çocuk')]
    const yonetimId = await ensureInst(`${profile.name} İl Yönetimi`, 'Yönetim')

    // ── İl künyesi (teşkilat boyutu için şart) ──
    const orgKeys = ['ilBaskani', 'teskilatBsk', 'egitimBsk', 'universiteBsk', 'liseBsk', 'ortaokulBsk',
      'ihhCocukBsk', 'tanitimMedya', 'projeFonBsk', 'sosyalFaal', 'atomBsk', 'aktifGenclik']
    const filledCount = Math.round(s * 12)
    const orgStatus = Object.fromEntries(orgKeys.map((k, i) => [k, i < filledCount]))
    const orgNames = Object.fromEntries(orgKeys.map(k => [k, orgStatus[k] ? getRandomName(rand) : null]))

    const districtList = DISTRICTS_MAP[profile.name] ?? ['Merkez']
    const totalDistricts = districtList.length
    const districtDetails = districtList.map(name => {
      const hasIhh = rand() < s * 0.8
      const hasGencIhh = hasIhh && rand() < s * 0.7
      return { name, hasIhh, hasGencIhh }
    })

    const ihhDistrictCount = districtDetails.filter(d => d.hasIhh).length
    const gencIhhDistrictCount = districtDetails.filter(d => d.hasGencIhh).length

    await prisma.provinceReport.upsert({
      where: { provinceId_year: { provinceId: province.id, year } },
      update: {
        orgStatus,
        orgNames,
        totalDistrictCount: totalDistricts,
        ihhDistrictCount,
        gencIhhDistrictCount,
        districtDetails,
      },
      create: {
        provinceId: province.id, year, createdBy: admin.id,
        population: between(400, 16000) * 1000,
        districtCount: totalDistricts,
        studentCount: between(50, 900) * 1000,
        universityCount: officialUnis.length,
        highSchoolCount: between(30, 300),
        middleSchoolCount: between(50, 400),
        kykCount: between(2, 15),
        dormCount: between(3, 25),
        orgStatus,
        orgNames,
        totalDistrictCount: totalDistricts,
        ihhDistrictCount,
        gencIhhDistrictCount,
        districtDetails,
        targets: {
          teskilatHedefi: between(10, 40), ilceHedefi: Math.round(totalDistricts * 0.7),
          fakulteBaskanHedefi: officialUnis.length * 3, liseTemsilciHedefi: between(5, 20),
          fonHedefi: between(50, 500) * 1000,
        },
      },
    })

    // ── Haftalık faaliyetler ──
    const rows: any[] = []
    const creator = (g: GenderBranch) =>
      profile.name === 'Ankara' ? (g === 'K' ? ankaraK.id : ankaraE.id) : admin.id

    for (const period of periods) {
      for (const g of [GenderBranch.K, GenderBranch.E]) {
        // Zayıf iller bazı haftaları atlar → süreklilik boyutu farklılaşır
        if (!chance(s * 0.9 + 0.05)) continue
        const scale = 0.6 + s * 0.8 // katılım çarpanı

        // İl yönetimi toplantısı (haftalık, yüksek olasılık)
        if (chance(0.85)) {
          rows.push({
            periodId: period.id, institutionId: yonetimId,
            activityTypeId: atByName.get('Toplantı')!.id,
            participantCount: Math.round(between(6, 14) * scale),
            genderBranch: g, createdBy: creator(g),
          })
        }

        // Üniversiteler
        for (const uni of uniIds) {
          if (!chance(s * 0.85)) continue
          const fac = uni.faculties[between(0, uni.faculties.length - 1)]
          rows.push({
            periodId: period.id, institutionId: uni.id, facultyId: fac,
            activityTypeId: atByName.get('Toplantı')!.id,
            participantCount: Math.round(between(8, 30) * scale),
            genderBranch: g, createdBy: creator(g),
          })
          if (chance(s * 0.8)) {
            rows.push({
              periodId: period.id, institutionId: uni.id, facultyId: uni.faculties[between(0, uni.faculties.length - 1)],
              activityTypeId: atByName.get('Haftalık Ders')!.id,
              participantCount: Math.round(between(15, 60) * scale),
              genderBranch: g, createdBy: creator(g),
            })
          }
          if (chance(0.25)) {
            rows.push({
              periodId: period.id, institutionId: uni.id,
              activityTypeId: atByName.get(chance(0.5) ? 'Sosyal Faaliyet' : 'Tanıtım/Medya')!.id,
              participantCount: Math.round(between(20, 80) * scale),
              genderBranch: g, createdBy: creator(g),
            })
          }
          if (chance(0.12)) {
            rows.push({
              periodId: period.id, institutionId: uni.id,
              activityTypeId: atByName.get('Proje/Fon')!.id,
              participantCount: Math.round(between(5, 15) * scale),
              genderBranch: g, createdBy: creator(g),
            })
          }
        }

        // Liseler
        for (const liseId of liseIds) {
          if (!chance(s * 0.75)) continue
          rows.push({
            periodId: period.id, institutionId: liseId,
            activityTypeId: atByName.get('Haftalık Ders')!.id,
            participantCount: Math.round(between(12, 40) * scale),
            genderBranch: g, createdBy: creator(g),
          })
          if (chance(0.3)) {
            rows.push({
              periodId: period.id, institutionId: liseId,
              activityTypeId: atByName.get(chance(0.6) ? 'Sosyal Faaliyet' : 'Toplantı')!.id,
              participantCount: Math.round(between(10, 50) * scale),
              genderBranch: g, createdBy: creator(g),
            })
          }
        }

        // Ortaokullar
        for (const ooId of ortaokulIds) {
          if (!chance(s * 0.55)) continue
          rows.push({
            periodId: period.id, institutionId: ooId,
            activityTypeId: atByName.get(chance(0.7) ? 'Haftalık Ders' : 'Saha Ziyareti')!.id,
            participantCount: Math.round(between(8, 30) * scale),
            genderBranch: g, createdBy: creator(g),
          })
        }

        // Çocuk
        for (const cId of cocukIds) {
          if (!chance(s * 0.45)) continue
          rows.push({
            periodId: period.id, institutionId: cId,
            activityTypeId: atByName.get(chance(0.6) ? 'Sosyal Faaliyet' : 'Haftalık Ders')!.id,
            participantCount: Math.round(between(10, 35) * scale),
            genderBranch: g, createdBy: creator(g),
          })
        }
      }
    }

    if (rows.length > 0) {
      await prisma.activity.createMany({ data: rows })
      totalActivities += rows.length
    }
    console.log(`  ✅ ${profile.name.padEnd(10)} güç=${s}  →  ${rows.length} faaliyet, ${officialUnis.length} üni, künye ✓`)
  }

  console.log(`\n🎉 Toplam ${totalActivities} faaliyet üretildi (${PROFILES.length} il × ${periods.length} hafta × 2 kol)`)

  // ── Örnek Raporlar (Arşiv ve Karne Raporları) ──
  const reportsToCreate = []
  const insightsToCreate = []

  for (const profile of PROFILES) {
    const province = provinceByName.get(profile.name)
    if (!province) continue

    const s = profile.strength
    
    // Örnek Karne snapshot'ı
    reportsToCreate.push({
      type: 'KARNE',
      scopeType: 'PROVINCE',
      scopeId: province.id,
      scopeName: province.name,
      year: year,
      title: `${province.name} İl Karnesi (${year})`,
      summaryJson: {
        total: Math.round(40 + s * 55),
        rank: PROFILES.findIndex(p => p.name === profile.name) + 1,
        nationalCount: PROFILES.length,
        grade: s > 0.8 ? 'A' : s > 0.6 ? 'B' : s > 0.4 ? 'C' : 'D',
        totalParticipants: Math.round(1000 + s * 8000),
        totalActivities: Math.round(50 + s * 200),
        institutionCount: Math.round(5 + s * 15),
        activeWeeks: Math.round(8 + s * 5)
      },
      snapshotJson: {
        provinceName: province.name,
        totalScore: Math.round(40 + s * 55),
        details: "Bu karne sistem tarafından otomatik olarak arşivlenmiş karne snapshot verisidir."
      },
      generatedBy: admin.id,
      generatedAt: new Date(Date.now() - between(1, 10) * 24 * 60 * 60 * 1000)
    })

    // Örnek AI Insight analizi
    insightsToCreate.push({
      type: 'KARNE',
      scopeType: 'PROVINCE',
      scopeId: province.id,
      scopeName: province.name,
      year: year,
      title: `${province.name} AI Karne Değerlendirmesi`,
      prompt: `Karne verilerine göre ${province.name} ilinin performansını analiz et.`,
      response: `${province.name} Genç İHH teşkilatı bu dönemde toplamda ${Math.round(1000 + s * 8000)} kişiye ulaşarak önemli bir başarı elde etmiştir. Teşkilat şeması %${Math.round(s * 100)} oranında tamamlanmıştır. Üniversitelerdeki ders katılımı güçlüdür ancak lise çalışmalarında süreklilik artırılmalıdır.`,
      generatedBy: admin.id,
      generatedAt: new Date(Date.now() - between(1, 10) * 24 * 60 * 60 * 1000)
    })

    // Her il için 3 haftalık rapor ekle
    for (let w = 11; w <= 13; w++) {
      const pCount = Math.round((400 + s * 1200) * (w / 12));
      const aCount = Math.round((10 + s * 30) * (w / 12));
      reportsToCreate.push({
        type: 'HAFTALIK',
        scopeType: 'PROVINCE',
        scopeId: province.id,
        scopeName: province.name,
        year: year,
        periodId: periods.find(p => p.weekNo === w)?.id,
        title: `${province.name} — ${year} Yılı ${w}. Hafta Raporu`,
        summaryJson: { totalActivities: aCount, totalParticipants: pCount },
        snapshotJson: { 
          period: { weekNo: w, year },
          scopeName: province.name,
          scopeType: 'PROVINCE',
          totalActivities: aCount, 
          totalParticipants: pCount,
          byActivityType: [
            { name: "Toplantı", count: Math.round(pCount * 0.4) },
            { name: "Haftalık Ders", count: Math.round(pCount * 0.6) }
          ],
          byUnit: [
            { name: "Üniversite", participants: Math.round(pCount * 0.7), activities: Math.round(aCount * 0.5) },
            { name: "Lise", participants: Math.round(pCount * 0.3), activities: Math.round(aCount * 0.5) }
          ]
        },
        generatedBy: admin.id,
        generatedAt: new Date(Date.now() - (15 - w) * 7 * 24 * 60 * 60 * 1000) // haftalara göre geçmiş zaman
      })
    }
  }

  // Birkaç genel/bölgesel rapor ekle
  reportsToCreate.push({
    type: 'HAFTALIK',
    scopeType: 'COUNTRY',
    scopeId: null,
    scopeName: 'Türkiye',
    year: year,
    title: `Türkiye Geneli Haftalık Rapor (Hafta 13)`,
    summaryJson: { totalActivities: 450, totalParticipants: 12000, activeProvinces: 12 },
    snapshotJson: { totalActivities: 450, totalParticipants: 12000, activeProvinces: 12 },
    generatedBy: admin.id,
    generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  })

  insightsToCreate.push({
    type: 'TREND',
    scopeType: 'COUNTRY',
    scopeId: null,
    scopeName: 'Türkiye',
    year: year,
    title: `Türkiye Geneli Haftalık Trend Değerlendirmesi`,
    prompt: `13. hafta itibariyle Türkiye geneli trendleri analiz et.`,
    response: `Türkiye genelinde 13. hafta itibarıyla Genç İHH birimleri katılım düzeylerinde istikrarlı bir grafik çizmiştir. Marmara bölgesi liderliğini korurken, İç Anadolu bölgesinde haftalık ders faaliyetleri öne çıkmıştır. Gelecek haftalarda kermes ve sosyal faaliyetlerin yoğunlaşması beklenmektedir.`,
    generatedBy: admin.id,
    generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  })

  await prisma.report.createMany({ data: reportsToCreate })
  await prisma.aiInsight.createMany({ data: insightsToCreate })
  console.log(`✅ ${reportsToCreate.length} örnek arşiv raporu ve ${insightsToCreate.length} örnek AI analizi oluşturuldu`)
}

main()
  .catch(e => { console.error('❌ Demo veri hatası:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })

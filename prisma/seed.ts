import { PrismaClient, Role, GenderBranch } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { UNIVERSITIES } from '../lib/universities'
import { config } from 'dotenv'

// .env.local'dan DATABASE_URL'yi yükle
config({ path: '.env.local', override: true })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ Geçerli DATABASE_URL bulunamadı (.env.local beklenir)')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })



async function main() {
  console.log('🌱 Seed başlıyor...')

  // ==================== BÖLGELER ====================
  const regions = await Promise.all(
    [
      '1. Bölge',
      '3. Bölge',
      '3. Bölge',
      '2. Bölge',
      '4. Bölge',
      '4. Bölge',
      '4. Bölge',
    ].map((name) =>
      prisma.region.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )
  console.log(`✅ ${regions.length} bölge oluşturuldu`)

  const regionMap: Record<string, number> = {}
  regions.forEach((r) => (regionMap[r.name] = r.id))

  // ==================== İLLER ====================
  const provincesData: [string, string][] = [
    // 1. Bölge
    ['İstanbul', '1. Bölge'], ['Bursa', '1. Bölge'], ['Kocaeli', '1. Bölge'],
    ['Tekirdağ', '1. Bölge'], ['Balıkesir', '1. Bölge'], ['Edirne', '1. Bölge'],
    ['Kırklareli', '1. Bölge'], ['Sakarya', '1. Bölge'], ['Bilecik', '1. Bölge'],
    ['Çanakkale', '1. Bölge'], ['Yalova', '1. Bölge'],
    // 3. Bölge
    ['İzmir', '3. Bölge'], ['Aydın', '3. Bölge'], ['Denizli', '3. Bölge'],
    ['Manisa', '3. Bölge'], ['Muğla', '3. Bölge'], ['Afyonkarahisar', '3. Bölge'],
    ['Kütahya', '3. Bölge'], ['Uşak', '3. Bölge'],
    // 3. Bölge
    ['Antalya', '3. Bölge'], ['Adana', '3. Bölge'], ['Mersin', '3. Bölge'],
    ['Hatay', '3. Bölge'], ['Kahramanmaraş', '3. Bölge'], ['Osmaniye', '3. Bölge'],
    ['Burdur', '3. Bölge'], ['Isparta', '3. Bölge'],
    // 2. Bölge
    ['Ankara', '2. Bölge'], ['Konya', '2. Bölge'], ['Kayseri', '2. Bölge'],
    ['Eskişehir', '2. Bölge'], ['Sivas', '2. Bölge'], ['Yozgat', '2. Bölge'],
    ['Aksaray', '2. Bölge'], ['Niğde', '2. Bölge'], ['Nevşehir', '2. Bölge'],
    ['Kırıkkale', '2. Bölge'], ['Kırşehir', '2. Bölge'], ['Karaman', '2. Bölge'],
    ['Çankırı', '2. Bölge'],
    // 4. Bölge
    ['Trabzon', '4. Bölge'], ['Samsun', '4. Bölge'], ['Ordu', '4. Bölge'],
    ['Rize', '4. Bölge'], ['Giresun', '4. Bölge'], ['Artvin', '4. Bölge'],
    ['Gümüşhane', '4. Bölge'], ['Bayburt', '4. Bölge'], ['Tokat', '4. Bölge'],
    ['Amasya', '4. Bölge'], ['Çorum', '4. Bölge'], ['Sinop', '4. Bölge'],
    ['Kastamonu', '4. Bölge'], ['Bartın', '4. Bölge'], ['Karabük', '4. Bölge'],
    ['Zonguldak', '4. Bölge'], ['Bolu', '4. Bölge'], ['Düzce', '4. Bölge'],
    // 4. Bölge
    ['Erzurum', '4. Bölge'], ['Van', '4. Bölge'], ['Malatya', '4. Bölge'],
    ['Elazığ', '4. Bölge'], ['Ağrı', '4. Bölge'], ['Erzincan', '4. Bölge'],
    ['Bingöl', '4. Bölge'], ['Muş', '4. Bölge'], ['Bitlis', '4. Bölge'],
    ['Hakkari', '4. Bölge'], ['Kars', '4. Bölge'], ['Iğdır', '4. Bölge'],
    ['Ardahan', '4. Bölge'], ['Tunceli', '4. Bölge'],
    // 4. Bölge
    ['Gaziantep', '4. Bölge'], ['Diyarbakır', '4. Bölge'],
    ['Şanlıurfa', '4. Bölge'], ['Mardin', '4. Bölge'],
    ['Batman', '4. Bölge'], ['Siirt', '4. Bölge'],
    ['Şırnak', '4. Bölge'], ['Adıyaman', '4. Bölge'],
    ['Kilis', '4. Bölge'],
  ]

  // Batch iller — 10'ar grupla gönder (timeout önlemek için)
  const provinces: { id: number; name: string }[] = []
  for (const [name, regionName] of provincesData) {
    const p = await prisma.province.upsert({
      where: { name },
      update: {},
      create: { name, regionId: regionMap[regionName] },
    })
    provinces.push(p)
  }
  console.log(`✅ ${provinces.length} il oluşturuldu`)

  const provinceMap: Record<string, number> = {}
  provinces.forEach((p) => (provinceMap[p.name] = p.id))

  // ==================== BİRİMLER ====================
  const units = await Promise.all(
    [
      // Yönetim = ilin kendi komisyon toplantıları (Excel'deki YÖNETİM sütunu).
      // Kurumu yoktur; "{İl} İl Yönetimi" pseudo-kurumu üzerinden kaydedilir.
      { name: 'Yönetim', order: 0 },
      { name: 'Üniversite', order: 1 },
      { name: 'Lise', order: 2 },
      { name: 'Ortaokul', order: 3 },
      { name: 'Çocuk', order: 4 },
    ].map((u) =>
      prisma.unit.upsert({
        where: { name: u.name },
        update: {},
        create: u,
      })
    )
  )
  console.log(`✅ ${units.length} birim oluşturuldu`)

  const unitMap: Record<string, number> = {}
  units.forEach((u) => (unitMap[u.name] = u.id))

  // ==================== OKUL TÜRLERİ ====================
  const schoolTypes = await Promise.all(
    ['İHL', 'Fen Lisesi', 'Anadolu Lisesi', 'Meslek Lisesi', 'Diğer'].map(
      (name) =>
        prisma.schoolType.upsert({
          where: { name },
          update: {},
          create: { name },
        })
    )
  )
  console.log(`✅ ${schoolTypes.length} okul türü oluşturuldu`)

  const schoolTypeMap: Record<string, number> = {}
  schoolTypes.forEach((st) => (schoolTypeMap[st.name] = st.id))

  // ==================== AKTİVİTE TÜRLERİ ====================
  const activityTypesData = [
    { name: 'Toplantı', defaultWeight: 1 },
    { name: 'Haftalık Ders', defaultWeight: 2 },
    { name: 'Sosyal Faaliyet', defaultWeight: 1.5 },
    { name: 'Diğer Eğitim', defaultWeight: 2 },
    { name: 'Tanıtım/Medya', defaultWeight: 1 },
    { name: 'Saha Ziyareti', defaultWeight: 1.5 },
  ]

  const activityTypes = await Promise.all(
    activityTypesData.map((at) =>
      prisma.activityType.upsert({
        where: { name: at.name },
        update: {},
        create: at,
      })
    )
  )
  console.log(`✅ ${activityTypes.length} aktivite türü oluşturuldu`)

  // ==================== PUAN AĞIRLIKLARI ====================
  const weightData: { unitId: number; activityTypeId: number; weight: number }[] = []
  for (const unit of units) {
    for (const at of activityTypes) {
      weightData.push({
        unitId: unit.id,
        activityTypeId: at.id,
        weight: at.defaultWeight,
      })
    }
  }

  // Delete existing and recreate
  await prisma.scoreWeight.deleteMany({})
  await prisma.scoreWeight.createMany({ data: weightData })
  console.log(`✅ ${weightData.length} puan ağırlığı oluşturuldu`)

  // ==================== DÖNEMLER ====================
  // Bu haftanın + geçen haftanın period kaydı
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  // Hafta numarası hesapla
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNo = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )

  const currentPeriod = await prisma.period.upsert({
    where: { year_weekNo: { year: now.getFullYear(), weekNo } },
    update: {},
    create: {
      year: now.getFullYear(),
      weekNo,
      month: now.getMonth() + 1,
      startDate: monday,
      endDate: sunday,
    },
  })

  // Geçen hafta
  const lastMonday = new Date(monday)
  lastMonday.setDate(monday.getDate() - 7)
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)

  const lastPeriod = await prisma.period.upsert({
    where: { year_weekNo: { year: now.getFullYear(), weekNo: weekNo - 1 } },
    update: {},
    create: {
      year: now.getFullYear(),
      weekNo: weekNo - 1,
      month: lastMonday.getMonth() + 1,
      startDate: lastMonday,
      endDate: lastSunday,
    },
  })

  // Geçmiş aylar için dönemler (6 aylık trend verisi için)
  const pastPeriods = []
  for (let w = weekNo - 12; w < weekNo - 1; w++) {
    if (w <= 0) continue
    const pMonday = new Date(startOfYear)
    pMonday.setDate(startOfYear.getDate() + (w - 1) * 7)
    const pSunday = new Date(pMonday)
    pSunday.setDate(pMonday.getDate() + 6)
    pSunday.setHours(23, 59, 59, 999)

    const period = await prisma.period.upsert({
      where: { year_weekNo: { year: now.getFullYear(), weekNo: w } },
      update: {},
      create: {
        year: now.getFullYear(),
        weekNo: w,
        month: pMonday.getMonth() + 1,
        startDate: pMonday,
        endDate: pSunday,
      },
    })
    pastPeriods.push(period)
  }

  console.log(`✅ ${2 + pastPeriods.length} dönem oluşturuldu`)

  // ==================== TEST KULLANICILARI ====================
  const passwordHash = await bcrypt.hash('Test1234!', 10)

  const usersData = [
    {
      email: 'admin@test.com',
      fullName: 'Sistem Yöneticisi',
      role: Role.ADMIN,
      genderBranch: null,
      provinceId: null,
      regionId: null,
      unitId: null,
    },
    {
      email: 'ankara-k@test.com',
      fullName: 'Ankara Kadın Kolu Koordinatörü',
      role: Role.IL_KOORDINATOR,
      genderBranch: GenderBranch.K,
      provinceId: provinceMap['Ankara'],
      regionId: null,
      unitId: null,
    },
    {
      email: 'ankara-e@test.com',
      fullName: 'Ankara Erkek Kolu Koordinatörü',
      role: Role.IL_KOORDINATOR,
      genderBranch: GenderBranch.E,
      provinceId: provinceMap['Ankara'],
      regionId: null,
      unitId: null,
    },


  ]

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          passwordHash,
        },
      })
    )
  )
  console.log(`✅ ${users.length} test kullanıcısı oluşturuldu`)

  const userMap: Record<string, string> = {}
  users.forEach((u) => (userMap[u.email] = u.id))

  // ==================== ÖRNEK KURUMLAR ====================
  // NOT: Üniversiteler burada TANIMLANMAZ — resmî YÖK listesinden gelirler
  // (aşağıdaki "RESMÎ ÜNİVERSİTELER" bloğu). Buradaki liste yalnızca
  // lise/ortaokul gibi henüz resmî kaynağa bağlanmamış kurumlar içindir.
  const institutionsData = [
    { name: 'Ankara Fen Lisesi', provinceId: provinceMap['Ankara'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Fen Lisesi'] },
    { name: 'Ankara İHL', provinceId: provinceMap['Ankara'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['İHL'] },
    { name: 'Kocatepe Ortaokulu', provinceId: provinceMap['Ankara'], unitId: unitMap['Ortaokul'], schoolTypeId: null },
    // Yeni eklenen lise/ortaokullar (Ankara)
    { name: 'Gazi Anadolu Lisesi', provinceId: provinceMap['Ankara'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Anadolu Lisesi'] },
    { name: 'Atatürk Mesleki ve Teknik Anadolu Lisesi', provinceId: provinceMap['Ankara'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Meslek Lisesi'] },
    { name: 'Sincan İHL', provinceId: provinceMap['Ankara'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['İHL'] },
    { name: 'Çankaya Ortaokulu', provinceId: provinceMap['Ankara'], unitId: unitMap['Ortaokul'], schoolTypeId: null },
    { name: 'Mamak İmam Hatip Ortaokulu', provinceId: provinceMap['Ankara'], unitId: unitMap['Ortaokul'], schoolTypeId: null },
    // Yeni eklenen lise/ortaokullar (İstanbul)
    { name: 'Kabataş Erkek Lisesi', provinceId: provinceMap['İstanbul'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Anadolu Lisesi'] },
    { name: 'Kartal Anadolu İHL', provinceId: provinceMap['İstanbul'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['İHL'] },
    { name: 'Cağaloğlu Anadolu Lisesi', provinceId: provinceMap['İstanbul'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Anadolu Lisesi'] },
    { name: 'Kadıköy Mesleki ve Teknik Anadolu Lisesi', provinceId: provinceMap['İstanbul'], unitId: unitMap['Lise'], schoolTypeId: schoolTypeMap['Meslek Lisesi'] },
    { name: 'Üsküdar İmam Hatip Ortaokulu', provinceId: provinceMap['İstanbul'], unitId: unitMap['Ortaokul'], schoolTypeId: null },
    { name: 'Fatih Ortaokulu', provinceId: provinceMap['İstanbul'], unitId: unitMap['Ortaokul'], schoolTypeId: null },
  ]

  // Use createMany is not ideal for upsert. Let's do individual creates:
  const institutionResults = []
  for (const inst of institutionsData) {
    const existing = await prisma.institution.findFirst({
      where: { name: inst.name, provinceId: inst.provinceId },
    })
    if (!existing) {
      const created = await prisma.institution.create({ data: inst })
      institutionResults.push(created)
    } else {
      institutionResults.push(existing)
    }
  }
  console.log(`✅ ${institutionResults.length} kurum oluşturuldu`)

  const instMap: Record<string, number> = {}
  institutionResults.forEach((i) => (instMap[i.name] = i.id))

  // ==================== RESMÎ ÜNİVERSİTELER (YÖK) ====================
  // Üniversite adı formda serbest metin olarak girilemez; yalnızca bu
  // listeden seçilir. Liste lib/universities.ts içinde tutulur ve yılda bir
  // gözden geçirilir. Bu blok idempotenttir — tekrar çalıştırmak güvenlidir.
  let uniCreated = 0
  let uniSkipped = 0
  for (const uni of UNIVERSITIES) {
    const provinceId = provinceMap[uni.province]
    if (!provinceId) {
      console.warn(`⚠️  İl bulunamadı, atlandı: ${uni.province} (${uni.name})`)
      continue
    }
    const existing = await prisma.institution.findFirst({
      where: { name: uni.name, provinceId, unitId: unitMap['Üniversite'] },
    })
    if (existing) {
      instMap[uni.name] = existing.id
      uniSkipped++
      continue
    }
    const created = await prisma.institution.create({
      data: {
        name: uni.name,
        provinceId,
        unitId: unitMap['Üniversite'],
        schoolTypeId: null,
      },
    })
    instMap[uni.name] = created.id
    uniCreated++
  }
  console.log(`✅ Resmî üniversiteler: ${uniCreated} eklendi, ${uniSkipped} zaten vardı (toplam ${UNIVERSITIES.length})`)

  // ==================== FAKÜLTELER ====================
  const facultiesData = [
    { name: 'Hukuk Fakültesi', institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'] },
    { name: 'İktisadi ve İdari Bilimler', institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'] },
    { name: 'Mühendislik Fakültesi', institutionId: instMap['Ankara Yıldırım Beyazıt Üniversitesi'] },
    { name: 'Tıp Fakültesi', institutionId: instMap['Ankara Yıldırım Beyazıt Üniversitesi'] },
  ]

  const faculties = []
  for (const fac of facultiesData) {
    const existing = await prisma.faculty.findFirst({
      where: { name: fac.name, institutionId: fac.institutionId },
    })
    if (!existing) {
      faculties.push(await prisma.faculty.create({ data: fac }))
    } else {
      faculties.push(existing)
    }
  }
  console.log(`✅ ${faculties.length} fakülte oluşturuldu`)

  // ==================== ÖRNEK FAALİYETLER ====================
  const existingActivities = await prisma.activity.count()
  if (existingActivities === 0) {
    const sampleActivities = [
      // Ankara Kadın Kolu — bu hafta
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'], facultyId: faculties[0].id, activityTypeId: activityTypes[0].id, participantCount: 15, genderBranch: GenderBranch.K, location: 'Kampüs', note: 'Haftalık toplantı', createdBy: userMap['ankara-k@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'], facultyId: faculties[1].id, activityTypeId: activityTypes[1].id, participantCount: 25, genderBranch: GenderBranch.K, location: 'Dershane', note: 'Siyer dersi', createdBy: userMap['ankara-k@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Fen Lisesi'], activityTypeId: activityTypes[2].id, participantCount: 40, genderBranch: GenderBranch.K, location: 'Okul bahçesi', note: 'Kermes düzenlendi', createdBy: userMap['ankara-k@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara İHL'], activityTypeId: activityTypes[1].id, participantCount: 30, genderBranch: GenderBranch.K, location: 'Sınıf', note: 'Ahlak dersi', createdBy: userMap['ankara-k@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Kocatepe Ortaokulu'], activityTypeId: activityTypes[6].id, participantCount: 10, genderBranch: GenderBranch.K, location: 'Okul', note: 'Saha ziyareti', createdBy: userMap['ankara-k@test.com'] },

      // Ankara Erkek Kolu — bu hafta
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Yıldırım Beyazıt Üniversitesi'], facultyId: faculties[2].id, activityTypeId: activityTypes[0].id, participantCount: 20, genderBranch: GenderBranch.E, location: 'Kampüs', note: 'Haftalık toplantı', createdBy: userMap['ankara-e@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Yıldırım Beyazıt Üniversitesi'], facultyId: faculties[3].id, activityTypeId: activityTypes[3].id, participantCount: 8, genderBranch: GenderBranch.E, location: 'Online', note: 'Proje sunumu', createdBy: userMap['ankara-e@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Fen Lisesi'], activityTypeId: activityTypes[1].id, participantCount: 35, genderBranch: GenderBranch.E, location: 'Sınıf', note: 'Tarih dersi', createdBy: userMap['ankara-e@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara İHL'], activityTypeId: activityTypes[4].id, participantCount: 22, genderBranch: GenderBranch.E, location: 'Konferans salonu', note: 'Eğitim semineri', createdBy: userMap['ankara-e@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'], facultyId: faculties[0].id, activityTypeId: activityTypes[5].id, participantCount: 50, genderBranch: GenderBranch.E, location: 'Stant', note: 'Tanıtım standı', createdBy: userMap['ankara-e@test.com'] },

      // Geçen hafta — Ankara K
      { periodId: lastPeriod.id, institutionId: instMap['Ankara Hacı Bayram Veli Üniversitesi'], facultyId: faculties[0].id, activityTypeId: activityTypes[0].id, participantCount: 12, genderBranch: GenderBranch.K, location: 'Kampüs', note: 'Haftalık toplantı', createdBy: userMap['ankara-k@test.com'] },
      { periodId: lastPeriod.id, institutionId: instMap['Ankara Fen Lisesi'], activityTypeId: activityTypes[2].id, participantCount: 30, genderBranch: GenderBranch.K, location: 'Okul', note: 'Sosyal faaliyet', createdBy: userMap['ankara-k@test.com'] },

      // Geçen hafta — Ankara E
      { periodId: lastPeriod.id, institutionId: instMap['Ankara Yıldırım Beyazıt Üniversitesi'], facultyId: faculties[2].id, activityTypeId: activityTypes[1].id, participantCount: 28, genderBranch: GenderBranch.E, location: 'Kampüs', note: 'Ders', createdBy: userMap['ankara-e@test.com'] },
      { periodId: lastPeriod.id, institutionId: instMap['Ankara İHL'], activityTypeId: activityTypes[0].id, participantCount: 18, genderBranch: GenderBranch.E, location: 'Okul', note: 'Toplantı', createdBy: userMap['ankara-e@test.com'] },

      // İstanbul — Admin girişi (1. Bölge bölgesi verileri)
      { periodId: currentPeriod.id, institutionId: instMap['İstanbul Üniversitesi'], activityTypeId: activityTypes[0].id, participantCount: 45, genderBranch: GenderBranch.K, location: 'Kampüs', note: 'Genel toplantı', createdBy: userMap['admin@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['İstanbul Üniversitesi'], activityTypeId: activityTypes[1].id, participantCount: 60, genderBranch: GenderBranch.E, location: 'Amfi', note: 'Konferans', createdBy: userMap['admin@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Boğaziçi Üniversitesi'], activityTypeId: activityTypes[3].id, participantCount: 12, genderBranch: GenderBranch.K, location: 'Online', note: 'Proje toplantısı', createdBy: userMap['admin@test.com'] },
      { periodId: currentPeriod.id, institutionId: instMap['Boğaziçi Üniversitesi'], activityTypeId: activityTypes[2].id, participantCount: 35, genderBranch: GenderBranch.E, location: 'Kampüs', note: 'İftar programı', createdBy: userMap['admin@test.com'] },

      // Geçen hafta — İstanbul
      { periodId: lastPeriod.id, institutionId: instMap['İstanbul Üniversitesi'], activityTypeId: activityTypes[4].id, participantCount: 40, genderBranch: GenderBranch.K, location: 'Konferans salonu', note: 'Eğitim programı', createdBy: userMap['admin@test.com'] },
    ]

    await prisma.activity.createMany({ data: sampleActivities })
    console.log(`✅ ${sampleActivities.length} örnek faaliyet oluşturuldu`)
  } else {
    console.log(`⏭️  Faaliyetler zaten mevcut (${existingActivities} adet), atlanıyor`)
  }

  // ==================== ÖRNEK İL RAPORLARI (İlçe ve Teşkilat Verisi) ====================
  const reportsData = [
    {
      provinceId: provinceMap['Ankara'],
      year: now.getFullYear(),
      population: 5747325,
      districtCount: 25,
      studentCount: 320000,
      universityCount: 8,
      highSchoolCount: 150,
      middleSchoolCount: 210,
      kykCount: 15,
      dormCount: 25,
      totalDistrictCount: 25,
      ihhDistrictCount: 20,
      gencIhhDistrictCount: 15,
      districtDetails: [
        { name: 'Çankaya', hasIhh: true, hasGencIhh: true },
        { name: 'Keçiören', hasIhh: true, hasGencIhh: true },
        { name: 'Yenimahalle', hasIhh: true, hasGencIhh: false },
        { name: 'Mamak', hasIhh: true, hasGencIhh: true },
        { name: 'Etimesgut', hasIhh: false, hasGencIhh: false },
        { name: 'Sincan', hasIhh: true, hasGencIhh: true },
        { name: 'Altındağ', hasIhh: true, hasGencIhh: true },
        { name: 'Pursaklar', hasIhh: true, hasGencIhh: false },
        { name: 'Gölbaşı', hasIhh: true, hasGencIhh: true },
        { name: 'Polatlı', hasIhh: false, hasGencIhh: false },
      ],
      orgNames: {
        ilBaskani: 'Ahmet Yılmaz',
        teskilatBsk: 'Mehmet Demir',
        egitimBsk: 'Ayşe Kaya',
        universiteBsk: 'Fatma Çelik',
        liseBsk: 'Mustafa Şahin',
        ortaokulBsk: 'Ali Koç',
      },
      orgStatus: {
        ilBaskani: true,
        teskilatBsk: true,
        egitimBsk: true,
        universiteBsk: true,
        liseBsk: true,
        ortaokulBsk: true,
      },
      createdBy: userMap['admin@test.com'],
    },
    {
      provinceId: provinceMap['İstanbul'],
      year: now.getFullYear(),
      population: 15840900,
      districtCount: 39,
      studentCount: 1200000,
      universityCount: 15,
      highSchoolCount: 450,
      middleSchoolCount: 600,
      kykCount: 30,
      dormCount: 50,
      totalDistrictCount: 39,
      ihhDistrictCount: 35,
      gencIhhDistrictCount: 30,
      districtDetails: [
        { name: 'Kadıköy', hasIhh: true, hasGencIhh: true },
        { name: 'Üsküdar', hasIhh: true, hasGencIhh: true },
        { name: 'Fatih', hasIhh: true, hasGencIhh: true },
        { name: 'Eyüpsultan', hasIhh: true, hasGencIhh: true },
        { name: 'Beşiktaş', hasIhh: false, hasGencIhh: false },
        { name: 'Şişli', hasIhh: true, hasGencIhh: false },
        { name: 'Esenyurt', hasIhh: true, hasGencIhh: true },
        { name: 'Pendik', hasIhh: true, hasGencIhh: true },
        { name: 'Maltepe', hasIhh: true, hasGencIhh: true },
        { name: 'Kartal', hasIhh: true, hasGencIhh: true },
      ],
      orgNames: {
        ilBaskani: 'Hasan Yurt',
        teskilatBsk: 'Ömer Faruk',
        egitimBsk: 'Zeynep Al',
        universiteBsk: 'Burak Can',
      },
      orgStatus: {
        ilBaskani: true,
        teskilatBsk: true,
        egitimBsk: true,
        universiteBsk: true,
        liseBsk: false,
        ortaokulBsk: false,
      },
      createdBy: userMap['admin@test.com'],
    }
  ]

  for (const pr of reportsData) {
    await prisma.provinceReport.upsert({
      where: { provinceId_year: { provinceId: pr.provinceId, year: pr.year } },
      update: pr,
      create: pr,
    })
  }
  console.log(`✅ ${reportsData.length} örnek il raporu (ilçe ve teşkilat verisi) oluşturuldu`)

  console.log('\n🎉 Seed tamamlandı!')
  console.log('\n📋 Test Kullanıcıları:')
  console.log('  admin@test.com          / Test1234!  → ADMIN')
  console.log('  ankara-k@test.com       / Test1234!  → İL_KOORDINATOR (Ankara, Kadın)')
  console.log('  ankara-e@test.com       / Test1234!  → İL_KOORDINATOR (Ankara, Erkek)')


}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

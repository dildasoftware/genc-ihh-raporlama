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
      'Marmara',
      'Ege',
      'Akdeniz',
      'İç Anadolu',
      'Karadeniz',
      'Doğu Anadolu',
      'Güneydoğu Anadolu',
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
    // Marmara
    ['İstanbul', 'Marmara'], ['Bursa', 'Marmara'], ['Kocaeli', 'Marmara'],
    ['Tekirdağ', 'Marmara'], ['Balıkesir', 'Marmara'], ['Edirne', 'Marmara'],
    ['Kırklareli', 'Marmara'], ['Sakarya', 'Marmara'], ['Bilecik', 'Marmara'],
    ['Çanakkale', 'Marmara'], ['Yalova', 'Marmara'],
    // Ege
    ['İzmir', 'Ege'], ['Aydın', 'Ege'], ['Denizli', 'Ege'],
    ['Manisa', 'Ege'], ['Muğla', 'Ege'], ['Afyonkarahisar', 'Ege'],
    ['Kütahya', 'Ege'], ['Uşak', 'Ege'],
    // Akdeniz
    ['Antalya', 'Akdeniz'], ['Adana', 'Akdeniz'], ['Mersin', 'Akdeniz'],
    ['Hatay', 'Akdeniz'], ['Kahramanmaraş', 'Akdeniz'], ['Osmaniye', 'Akdeniz'],
    ['Burdur', 'Akdeniz'], ['Isparta', 'Akdeniz'],
    // İç Anadolu
    ['Ankara', 'İç Anadolu'], ['Konya', 'İç Anadolu'], ['Kayseri', 'İç Anadolu'],
    ['Eskişehir', 'İç Anadolu'], ['Sivas', 'İç Anadolu'], ['Yozgat', 'İç Anadolu'],
    ['Aksaray', 'İç Anadolu'], ['Niğde', 'İç Anadolu'], ['Nevşehir', 'İç Anadolu'],
    ['Kırıkkale', 'İç Anadolu'], ['Kırşehir', 'İç Anadolu'], ['Karaman', 'İç Anadolu'],
    ['Çankırı', 'İç Anadolu'],
    // Karadeniz
    ['Trabzon', 'Karadeniz'], ['Samsun', 'Karadeniz'], ['Ordu', 'Karadeniz'],
    ['Rize', 'Karadeniz'], ['Giresun', 'Karadeniz'], ['Artvin', 'Karadeniz'],
    ['Gümüşhane', 'Karadeniz'], ['Bayburt', 'Karadeniz'], ['Tokat', 'Karadeniz'],
    ['Amasya', 'Karadeniz'], ['Çorum', 'Karadeniz'], ['Sinop', 'Karadeniz'],
    ['Kastamonu', 'Karadeniz'], ['Bartın', 'Karadeniz'], ['Karabük', 'Karadeniz'],
    ['Zonguldak', 'Karadeniz'], ['Bolu', 'Karadeniz'], ['Düzce', 'Karadeniz'],
    // Doğu Anadolu
    ['Erzurum', 'Doğu Anadolu'], ['Van', 'Doğu Anadolu'], ['Malatya', 'Doğu Anadolu'],
    ['Elazığ', 'Doğu Anadolu'], ['Ağrı', 'Doğu Anadolu'], ['Erzincan', 'Doğu Anadolu'],
    ['Bingöl', 'Doğu Anadolu'], ['Muş', 'Doğu Anadolu'], ['Bitlis', 'Doğu Anadolu'],
    ['Hakkari', 'Doğu Anadolu'], ['Kars', 'Doğu Anadolu'], ['Iğdır', 'Doğu Anadolu'],
    ['Ardahan', 'Doğu Anadolu'], ['Tunceli', 'Doğu Anadolu'],
    // Güneydoğu Anadolu
    ['Gaziantep', 'Güneydoğu Anadolu'], ['Diyarbakır', 'Güneydoğu Anadolu'],
    ['Şanlıurfa', 'Güneydoğu Anadolu'], ['Mardin', 'Güneydoğu Anadolu'],
    ['Batman', 'Güneydoğu Anadolu'], ['Siirt', 'Güneydoğu Anadolu'],
    ['Şırnak', 'Güneydoğu Anadolu'], ['Adıyaman', 'Güneydoğu Anadolu'],
    ['Kilis', 'Güneydoğu Anadolu'],
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
    { name: 'Proje/Fon', defaultWeight: 3 },
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
    {
      email: 'marmara@test.com',
      fullName: 'Marmara Bölge Koordinatörü',
      role: Role.BOLGE_KOORDINATOR,
      genderBranch: null,
      provinceId: null,
      regionId: regionMap['Marmara'],
      unitId: null,
    },
    {
      email: 'univ-baskan@test.com',
      fullName: 'Üniversite Birim Başkanı',
      role: Role.MERKEZ_BIRIM_BASKANI,
      genderBranch: null,
      provinceId: null,
      regionId: null,
      unitId: unitMap['Üniversite'],
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

      // İstanbul — Admin girişi (Marmara bölgesi verileri)
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
  console.log('  marmara@test.com        / Test1234!  → BÖLGE_KOORDINATOR (Marmara)')
  console.log('  univ-baskan@test.com    / Test1234!  → MERKEZ_BIRIM_BASKANI (Üniversite)')
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

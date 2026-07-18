import { PrismaClient, Role, GenderBranch, ScopeType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
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
  console.log('🚀 Rich Demo Verisi Ekleniyor...')

  const adminEmail = 'admin@test.com'
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    const passwordHash = await bcrypt.hash('Test1234!', 10)
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Sistem Yöneticisi',
        role: Role.ADMIN,
        passwordHash,
      }
    })
  }

  // Bölgeler (1. Bölge = Marmara, 2. Bölge = İç Anadolu)
  const region1 = await prisma.region.findFirst({ where: { name: '1. Bölge' } })
  const region2 = await prisma.region.findFirst({ where: { name: '2. Bölge' } })

  if (!region1 || !region2) {
    console.error('Bölgeler bulunamadı, önce npx tsx prisma/seed.ts çalıştırın.')
    return
  }

  // İller
  const provinces = await prisma.province.findMany({
    where: { regionId: { in: [region1.id, region2.id] } }
  })

  const istanbul = provinces.find(p => p.name === 'İstanbul')
  const ankara = provinces.find(p => p.name === 'Ankara')
  const bursa = provinces.find(p => p.name === 'Bursa')
  const kocaeli = provinces.find(p => p.name === 'Kocaeli')
  const konya = provinces.find(p => p.name === 'Konya')

  const targetProvinces = [istanbul, ankara, bursa, kocaeli, konya].filter(Boolean)

  const units = await prisma.unit.findMany()
  const activityTypes = await prisma.activityType.findMany()
  const periods = await prisma.period.findMany()

  // Kullanıcılar (Koordinatörler)
  const users: Record<string, any> = {}
  for (const p of targetProvinces) {
    if (!p) continue
    const emailK = `k-${p.name.toLowerCase().replace('ı', 'i')}@test.com`
    const emailE = `e-${p.name.toLowerCase().replace('ı', 'i')}@test.com`

    let userK = await prisma.user.findUnique({ where: { email: emailK } })
    if (!userK) {
      userK = await prisma.user.create({
        data: {
          email: emailK,
          fullName: `${p.name} Kadın Kolu Koordinatörü`,
          role: Role.IL_KOORDINATOR,
          genderBranch: GenderBranch.K,
          provinceId: p.id,
          passwordHash: await bcrypt.hash('Test1234!', 10)
        }
      })
    }
    
    let userE = await prisma.user.findUnique({ where: { email: emailE } })
    if (!userE) {
      userE = await prisma.user.create({
        data: {
          email: emailE,
          fullName: `${p.name} Erkek Kolu Koordinatörü`,
          role: Role.IL_KOORDINATOR,
          genderBranch: GenderBranch.E,
          provinceId: p.id,
          passwordHash: await bcrypt.hash('Test1234!', 10)
        }
      })
    }
    users[p.id] = { K: userK, E: userE }
  }

  // Rastgele veriler için yardımcılar
  const randomChoice = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  const locations = ['Kampüs', 'Dershane', 'Okul', 'Salon', 'Online', 'Vakıf Merkezi', 'Stant', 'Çadır', 'Kütüphane', 'Gençlik Merkezi']
  const notes = ['Çok verimli geçti', 'Katılım yoğundu', 'Haftaya tekrarı yapılacak', 'Yeni gönüllüler kazandık', 'Eksikler tespit edildi', 'Önümüzdeki ay için planlama yapıldı', 'Genel başkan katılım sağladı']

  let activityCount = 0

  console.log('Faaliyetler oluşturuluyor...')
  
  // Her il için bolca faaliyet
  for (const p of targetProvinces) {
    if (!p) continue
    
    // Kurumlar
    let insts = await prisma.institution.findMany({ where: { provinceId: p.id } })
    if (insts.length === 0) {
      // Kurum yoksa ekle
      const liseUnit = units.find(u => u.name === 'Lise')
      const uniUnit = units.find(u => u.name === 'Üniversite')
      if (liseUnit && uniUnit) {
        await prisma.institution.createMany({
          data: [
            { name: `${p.name} Merkez Anadolu Lisesi`, provinceId: p.id, unitId: liseUnit.id },
            { name: `${p.name} İmam Hatip Lisesi`, provinceId: p.id, unitId: liseUnit.id },
            { name: `${p.name} Üniversitesi`, provinceId: p.id, unitId: uniUnit.id },
          ]
        })
        insts = await prisma.institution.findMany({ where: { provinceId: p.id } })
      }
    }

    if (insts.length === 0) continue

    const faculties = await prisma.faculty.findMany({ where: { institutionId: { in: insts.map(i => i.id) } } })

    for (const period of periods) {
      // Her periyot için her ilde 5-15 aktivite
      const activityNum = randomInt(5, 15)
      const activities = []

      for (let i = 0; i < activityNum; i++) {
        const branch = randomChoice([GenderBranch.K, GenderBranch.E])
        const inst = randomChoice(insts)
        const faculty = faculties.find(f => f.institutionId === inst.id) ? randomChoice(faculties.filter(f => f.institutionId === inst.id)) : undefined
        const at = randomChoice(activityTypes)

        activities.push({
          periodId: period.id,
          institutionId: inst.id,
          facultyId: faculty?.id,
          activityTypeId: at.id,
          participantCount: randomInt(10, 150),
          genderBranch: branch,
          location: randomChoice(locations),
          note: randomChoice(notes),
          createdBy: users[p.id]?.[branch]?.id || admin.id
        })
      }

      await prisma.activity.createMany({ data: activities })
      activityCount += activities.length

      // Bu periyot ve il için Arşivlenmiş Rapor (Snapshot)
      // Ancak sadece en son 3 periyot için rapor atalım ki archive dolsun
      const pIndex = periods.indexOf(period)
      if (pIndex > periods.length - 4) {
        // Rapor oluştur
        const reportJson = {
          femaleParticipants: activities.filter(a => a.genderBranch === 'K').reduce((sum, a) => sum + a.participantCount, 0),
          maleParticipants: activities.filter(a => a.genderBranch === 'E').reduce((sum, a) => sum + a.participantCount, 0),
          totalParticipants: activities.reduce((sum, a) => sum + a.participantCount, 0),
          activityCount: activities.length,
          institutions: insts.slice(0, 3).map(i => ({ name: i.name, unitName: units.find(u => u.id === i.unitId)?.name })),
          byUnit: units.map(u => ({
            name: u.name,
            totalScore: randomInt(10, 100),
            activityCount: randomInt(1, 10)
          }))
        }

        const report = await prisma.report.create({
          data: {
            type: 'HAFTALIK',
            scopeType: 'PROVINCE',
            scopeId: p.id,
            scopeName: p.name,
            periodId: period.id,
            year: period.year,
            title: `${p.name} Haftalık Raporu`,
            snapshotJson: reportJson,
            generatedBy: admin.id
          }
        })

        // AiInsight oluştur
        await prisma.aiInsight.create({
          data: {
            type: 'HAFTALIK_RAPOR',
            scopeType: 'PROVINCE',
            scopeId: p.id,
            scopeName: p.name,
            periodId: period.id,
            year: period.year,
            title: `${p.name} AI Analizi`,
            prompt: 'Haftalık raporu analiz et',
            response: `**${p.name} İli ${period.year} Yılı ${period.weekNo}. Hafta Analizi**\n\nBu hafta **${activities.length}** faaliyet gerçekleştirilmiş olup toplam **${reportJson.totalParticipants}** kişiye ulaşılmıştır. Eğitim faaliyetlerinde artış gözlemlenmektedir. Özellikle lise ve üniversite birimlerinde verimlilik yüksektir. Önümüzdeki hafta saha ziyaretlerine ağırlık verilmesi tavsiye edilir.\n\n### Öne Çıkanlar\n- Kadın kolu: ${reportJson.femaleParticipants} katılımcı\n- Erkek kolu: ${reportJson.maleParticipants} katılımcı\n- Kurumlar: ${reportJson.institutions.map(i => i.name).join(', ')}`,
            generatedBy: admin.id
          }
        })
      }
    }
  }

  console.log(`✅ ${activityCount} adet faaliyet başarıyla oluşturuldu!`)
  console.log('✅ Arşiv raporları ve AI analizleri (AiInsight) oluşturuldu!')
  console.log('\n🎉 Rich Demo verisi hazır. Sistemi test edebilirsiniz.')
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

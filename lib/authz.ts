import { Role, GenderBranch } from '@prisma/client'

export type SessionUser = {
  id: string
  role: Role
  genderBranch: GenderBranch | null
  provinceId: number | null
  regionId: number | null
  unitId: number | null
  fullName: string
}

/**
 * Activities tablosu için Prisma where clause üretir.
 * Cinsiyet mantığı:
 * - İl koordinatörü: kendi kolu kilitli, filtre yok sayılır
 * - Bölge+: varsayılan ALL (birleşik), filtre ile ayrıştırılabilir
 */
export function buildActivityFilter(
  user: SessionUser,
  requestedGenderFilter?: GenderBranch | 'ALL'
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { deletedAt: null }

  switch (user.role) {
    case 'IL_KOORDINATOR':
      where.institution = { provinceId: user.provinceId }
      where.genderBranch = user.genderBranch // kilitli
      break

    // Bölge koordinatörü YALNIZ kendi bölgesinin illerini görür.
    // Bu case silinirse switch hiçbir filtre uygulamaz ve bölge kullanıcısı
    // tüm ülkenin ham verisini görür — yetki sızıntısı. Kaldırmayın.
    case 'BOLGE_KOORDINATOR':
      where.institution = { province: { regionId: user.regionId } }
      if (requestedGenderFilter && requestedGenderFilter !== 'ALL') {
        where.genderBranch = requestedGenderFilter
      }
      break

    case 'MERKEZ_BIRIM_BASKANI':
      where.institution = { unitId: user.unitId }
      if (requestedGenderFilter && requestedGenderFilter !== 'ALL') {
        where.genderBranch = requestedGenderFilter
      }
      break

    case 'ADMIN':
      if (requestedGenderFilter && requestedGenderFilter !== 'ALL') {
        where.genderBranch = requestedGenderFilter
      }
      break
  }

  return where
}

/**
 * Kurum sorguları için Prisma where clause üretir.
 */
export function buildInstitutionFilter(user: SessionUser) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  switch (user.role) {
    case 'IL_KOORDINATOR':
      where.provinceId = user.provinceId
      break
    case 'BOLGE_KOORDINATOR':
      where.province = { regionId: user.regionId }
      break
    case 'MERKEZ_BIRIM_BASKANI':
      where.unitId = user.unitId
      break
    case 'ADMIN':
      // Her şeyi görür
      break
  }

  return where
}

/**
 * Kullanıcının görebildiği il ID'lerini döndürür.
 * null = tüm iller (Admin)
 */
export async function buildProvinceScope(
  user: SessionUser,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<number[] | null> {
  switch (user.role) {
    case 'IL_KOORDINATOR':
      return user.provinceId ? [user.provinceId] : []

    case 'BOLGE_KOORDINATOR': {
      if (!user.regionId) return []
      const provinces = await prisma.province.findMany({
        where: { regionId: user.regionId },
        select: { id: true },
      })
      return provinces.map((p: { id: number }) => p.id)
    }

    case 'MERKEZ_BIRIM_BASKANI':
    case 'ADMIN':
      return null // tüm iller

    default:
      return []
  }
}

/**
 * Kullanıcı belirtilen rollerden birine sahip değilse hata fırlatır.
 */
export function assertRole(user: SessionUser, allowedRoles: Role[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Yetkisiz erişim. Gerekli rol: ${allowedRoles.join(', ')}`)
  }
}

/** Kullanıcı veri girebilir mi? */
export function canWrite(user: SessionUser): boolean {
  return user.role === 'IL_KOORDINATOR' || user.role === 'ADMIN'
}

/** Kullanıcı rapor üretebilir mi? */
export function canGenerateReport(user: SessionUser): boolean {
  return true // Tüm roller (İl Koordinatörü dahil) kendi yetki alanındaki verilerle AI analizi yapabilir
}

/** Kullanıcı kayıt silebilir mi? */
export function canDelete(user: SessionUser): boolean {
  return user.role === 'ADMIN'
}

/** Rol Türkçe karşılığı */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    IL_KOORDINATOR: 'İl Koordinatörü',
    BOLGE_KOORDINATOR: 'Bölge Koordinatörü',
    MERKEZ_BIRIM_BASKANI: 'Genel Merkez Birim Başkanı',
    ADMIN: 'Sistem Yöneticisi',
  }
  return labels[role] || role
}

/** Cinsiyet kolu Türkçe karşılığı */
export function getGenderLabel(branch: GenderBranch | null): string {
  if (!branch) return 'Tümü'
  return branch === 'K' ? 'Kadın Kolu' : 'Erkek Kolu'
}

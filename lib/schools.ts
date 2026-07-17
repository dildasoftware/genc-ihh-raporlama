/**
 * Statik lise ve ortaokul listesi — demo 12 il için.
 *
 * MEB'in resmî bir açık API'si bulunmadığından, üniversiteler gibi
 * bu liste de statik olarak tutulur. Her okul: ad, il, tür.
 *
 * Tür: 'İHL' | 'Fen Lisesi' | 'Anadolu Lisesi' | 'Meslek Lisesi' | 'Diğer'
 * Birim: 'Lise' | 'Ortaokul'
 */

export interface SchoolEntry {
  name: string
  province: string
  unit: 'Lise' | 'Ortaokul'
  schoolType?: string // sadece lise için
}

export const SCHOOLS: SchoolEntry[] = [
  // ── Ankara ──
  { name: 'Ankara Fen Lisesi', province: 'Ankara', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Ankara Anadolu İmam Hatip Lisesi', province: 'Ankara', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Ankara Anadolu Lisesi', province: 'Ankara', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Kocatepe Anadolu Lisesi', province: 'Ankara', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Ankara Pursaklar İmam Hatip Lisesi', province: 'Ankara', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Ankara Fatih Ortaokulu', province: 'Ankara', unit: 'Ortaokul' },
  { name: 'Ankara Atatürk Ortaokulu', province: 'Ankara', unit: 'Ortaokul' },
  { name: 'Ankara Yıldırım Beyazıt Ortaokulu', province: 'Ankara', unit: 'Ortaokul' },

  // ── İstanbul ──
  { name: 'İstanbul Erkek Lisesi', province: 'İstanbul', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'İstanbul İmam Hatip Lisesi', province: 'İstanbul', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Kartal Anadolu Lisesi', province: 'İstanbul', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Üsküdar Fen Lisesi', province: 'İstanbul', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Fatih Sultan Mehmet İmam Hatip Lisesi', province: 'İstanbul', unit: 'Lise', schoolType: 'İHL' },
  { name: 'İstanbul Beyoğlu Ortaokulu', province: 'İstanbul', unit: 'Ortaokul' },
  { name: 'İstanbul Fatih Ortaokulu', province: 'İstanbul', unit: 'Ortaokul' },
  { name: 'İstanbul Kadıköy Ortaokulu', province: 'İstanbul', unit: 'Ortaokul' },

  // ── Konya ──
  { name: 'Konya Fen Lisesi', province: 'Konya', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Konya Meram İmam Hatip Lisesi', province: 'Konya', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Konya Karatay Anadolu Lisesi', province: 'Konya', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Konya Selçuklu Mesleki ve Teknik Anadolu Lisesi', province: 'Konya', unit: 'Lise', schoolType: 'Meslek Lisesi' },
  { name: 'Konya Mevlana Ortaokulu', province: 'Konya', unit: 'Ortaokul' },
  { name: 'Konya Selçuklu Ortaokulu', province: 'Konya', unit: 'Ortaokul' },

  // ── Bursa ──
  { name: 'Bursa Fen Lisesi', province: 'Bursa', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Bursa Osmangazi İmam Hatip Lisesi', province: 'Bursa', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Bursa Nilüfer Anadolu Lisesi', province: 'Bursa', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Bursa Yıldırım Ortaokulu', province: 'Bursa', unit: 'Ortaokul' },
  { name: 'Bursa Osmangazi Ortaokulu', province: 'Bursa', unit: 'Ortaokul' },

  // ── İzmir ──
  { name: 'İzmir Fen Lisesi', province: 'İzmir', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'İzmir Bornova İmam Hatip Lisesi', province: 'İzmir', unit: 'Lise', schoolType: 'İHL' },
  { name: 'İzmir Konak Anadolu Lisesi', province: 'İzmir', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'İzmir Karşıyaka Ortaokulu', province: 'İzmir', unit: 'Ortaokul' },
  { name: 'İzmir Buca Ortaokulu', province: 'İzmir', unit: 'Ortaokul' },

  // ── Kocaeli ──
  { name: 'Kocaeli Fen Lisesi', province: 'Kocaeli', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Kocaeli İzmit İmam Hatip Lisesi', province: 'Kocaeli', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Kocaeli Gebze Anadolu Lisesi', province: 'Kocaeli', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Kocaeli İzmit Ortaokulu', province: 'Kocaeli', unit: 'Ortaokul' },
  { name: 'Kocaeli Gebze Ortaokulu', province: 'Kocaeli', unit: 'Ortaokul' },

  // ── Gaziantep ──
  { name: 'Gaziantep Fen Lisesi', province: 'Gaziantep', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Gaziantep Şahinbey İmam Hatip Lisesi', province: 'Gaziantep', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Gaziantep Şehitkamil Anadolu Lisesi', province: 'Gaziantep', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Gaziantep Nizip Mesleki ve Teknik Anadolu Lisesi', province: 'Gaziantep', unit: 'Lise', schoolType: 'Meslek Lisesi' },
  { name: 'Gaziantep Şahinbey Ortaokulu', province: 'Gaziantep', unit: 'Ortaokul' },
  { name: 'Gaziantep Şehitkamil Ortaokulu', province: 'Gaziantep', unit: 'Ortaokul' },

  // ── Kayseri ──
  { name: 'Kayseri Fen Lisesi', province: 'Kayseri', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Kayseri Melikgazi İmam Hatip Lisesi', province: 'Kayseri', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Kayseri Kocasinan Anadolu Lisesi', province: 'Kayseri', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Kayseri Melikgazi Ortaokulu', province: 'Kayseri', unit: 'Ortaokul' },
  { name: 'Kayseri Kocasinan Ortaokulu', province: 'Kayseri', unit: 'Ortaokul' },

  // ── Trabzon ──
  { name: 'Trabzon Fen Lisesi', province: 'Trabzon', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Trabzon İmam Hatip Lisesi', province: 'Trabzon', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Trabzon Anadolu Lisesi', province: 'Trabzon', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Trabzon Ortahisar Ortaokulu', province: 'Trabzon', unit: 'Ortaokul' },
  { name: 'Trabzon Akçaabat Ortaokulu', province: 'Trabzon', unit: 'Ortaokul' },

  // ── Samsun ──
  { name: 'Samsun Fen Lisesi', province: 'Samsun', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Samsun Atakum İmam Hatip Lisesi', province: 'Samsun', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Samsun Canik Anadolu Lisesi', province: 'Samsun', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Samsun İlkadım Ortaokulu', province: 'Samsun', unit: 'Ortaokul' },
  { name: 'Samsun Atakum Ortaokulu', province: 'Samsun', unit: 'Ortaokul' },

  // ── Erzurum ──
  { name: 'Erzurum Fen Lisesi', province: 'Erzurum', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Erzurum İbrahim Hakkı İmam Hatip Lisesi', province: 'Erzurum', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Erzurum Yakutiye Anadolu Lisesi', province: 'Erzurum', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Erzurum Yakutiye Ortaokulu', province: 'Erzurum', unit: 'Ortaokul' },
  { name: 'Erzurum Palandöken Ortaokulu', province: 'Erzurum', unit: 'Ortaokul' },

  // ── Van ──
  { name: 'Van Fen Lisesi', province: 'Van', unit: 'Lise', schoolType: 'Fen Lisesi' },
  { name: 'Van İpekyolu İmam Hatip Lisesi', province: 'Van', unit: 'Lise', schoolType: 'İHL' },
  { name: 'Van Tuşba Anadolu Lisesi', province: 'Van', unit: 'Lise', schoolType: 'Anadolu Lisesi' },
  { name: 'Van İpekyolu Ortaokulu', province: 'Van', unit: 'Ortaokul' },
  { name: 'Van Edremit Ortaokulu', province: 'Van', unit: 'Ortaokul' },
]

/** Belirtilen ildeki okulları döndürür */
export function schoolsOfProvince(provinceName: string): SchoolEntry[] {
  return SCHOOLS.filter(s => s.province === provinceName)
}

/** Belirtilen ildeki liseleri döndürür */
export function lisesOfProvince(provinceName: string): SchoolEntry[] {
  return SCHOOLS.filter(s => s.province === provinceName && s.unit === 'Lise')
}

/** Belirtilen ildeki ortaokulları döndürür */
export function ortaokulsOfProvince(provinceName: string): SchoolEntry[] {
  return SCHOOLS.filter(s => s.province === provinceName && s.unit === 'Ortaokul')
}

/**
 * Resmî üniversite listesi (YÖK) — il eşleşmeli.
 *
 * NEDEN STATİK LİSTE:
 * Kullanıcı "yokatlas.py" adlı mevcut bir veri kaynağına atıf yaptı, ancak
 * böyle bir dosya ne çalışma dizininde ne git geçmişinde bulunuyor. Dış
 * servise runtime bağımlılığı yaratmamak için liste burada sabit tutuluyor.
 *
 * BAKIM NOTU:
 * Üniversite adları/illeri zamanla değişir (yeni kuruluşlar, ad değişiklikleri).
 * Bu liste YILDA BİR gözden geçirilmelidir. Yeni bir üniversite eklemek için
 * ilgili ilin dizisine adını yazmak yeterlidir — seed idempotenttir.
 *
 * Liste `prisma/seed.ts` tarafından Institution tablosuna (unit = "Üniversite")
 * yazılır. Form tarafında üniversite adı SERBEST METİN OLARAK GİRİLEMEZ;
 * yalnızca bu listeden seçilir (bkz. HaftalikSoruFormu allowCreate={false}).
 */

export type UniversityKind = 'DEVLET' | 'VAKIF' | 'KKTC'

export interface UniversityDef {
  name: string
  province: string
  kind: UniversityKind
}

/** İl → o ildeki üniversiteler */
const BY_PROVINCE: Record<string, { devlet: string[]; vakif?: string[] }> = {
  'Adana': {
    devlet: ['Çukurova Üniversitesi', 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi'],
  },
  'Adıyaman': { devlet: ['Adıyaman Üniversitesi'] },
  'Afyonkarahisar': {
    devlet: ['Afyon Kocatepe Üniversitesi', 'Afyonkarahisar Sağlık Bilimleri Üniversitesi'],
  },
  'Ağrı': { devlet: ['Ağrı İbrahim Çeçen Üniversitesi'] },
  'Aksaray': { devlet: ['Aksaray Üniversitesi'] },
  'Amasya': { devlet: ['Amasya Üniversitesi'] },
  'Ankara': {
    devlet: [
      'Ankara Üniversitesi',
      'Gazi Üniversitesi',
      'Hacettepe Üniversitesi',
      'Orta Doğu Teknik Üniversitesi',
      'Ankara Hacı Bayram Veli Üniversitesi',
      'Ankara Yıldırım Beyazıt Üniversitesi',
      'Ankara Sosyal Bilimler Üniversitesi',
      'Ankara Müzik ve Güzel Sanatlar Üniversitesi',
      'Sağlık Bilimleri Üniversitesi',
    ],
    vakif: [
      'Bilkent Üniversitesi',
      'Başkent Üniversitesi',
      'Atılım Üniversitesi',
      'Çankaya Üniversitesi',
      'TOBB Ekonomi ve Teknoloji Üniversitesi',
      'Ufuk Üniversitesi',
      'Yüksek İhtisas Üniversitesi',
      'Ankara Bilim Üniversitesi',
      'Ankara Medipol Üniversitesi',
      'Lokman Hekim Üniversitesi',
      'Ostim Teknik Üniversitesi',
      'Ted Üniversitesi',
    ],
  },
  'Antalya': {
    devlet: ['Akdeniz Üniversitesi', 'Alanya Alaaddin Keykubat Üniversitesi'],
    vakif: ['Antalya Bilim Üniversitesi', 'Alanya Üniversitesi'],
  },
  'Ardahan': { devlet: ['Ardahan Üniversitesi'] },
  'Artvin': { devlet: ['Artvin Çoruh Üniversitesi'] },
  'Aydın': { devlet: ['Aydın Adnan Menderes Üniversitesi'] },
  'Balıkesir': { devlet: ['Balıkesir Üniversitesi', 'Bandırma Onyedi Eylül Üniversitesi'] },
  'Bartın': { devlet: ['Bartın Üniversitesi'] },
  'Batman': { devlet: ['Batman Üniversitesi'] },
  'Bayburt': { devlet: ['Bayburt Üniversitesi'] },
  'Bilecik': { devlet: ['Bilecik Şeyh Edebali Üniversitesi'] },
  'Bingöl': { devlet: ['Bingöl Üniversitesi'] },
  'Bitlis': { devlet: ['Bitlis Eren Üniversitesi'] },
  'Bolu': { devlet: ['Bolu Abant İzzet Baysal Üniversitesi'] },
  'Burdur': { devlet: ['Burdur Mehmet Akif Ersoy Üniversitesi'] },
  'Bursa': {
    devlet: ['Bursa Uludağ Üniversitesi', 'Bursa Teknik Üniversitesi'],
    vakif: ['Mudanya Üniversitesi'],
  },
  'Çanakkale': { devlet: ['Çanakkale Onsekiz Mart Üniversitesi'] },
  'Çankırı': { devlet: ['Çankırı Karatekin Üniversitesi'] },
  'Çorum': { devlet: ['Hitit Üniversitesi'] },
  'Denizli': { devlet: ['Pamukkale Üniversitesi'] },
  'Diyarbakır': { devlet: ['Dicle Üniversitesi'] },
  'Düzce': { devlet: ['Düzce Üniversitesi'] },
  'Edirne': { devlet: ['Trakya Üniversitesi'] },
  'Elazığ': { devlet: ['Fırat Üniversitesi'] },
  'Erzincan': { devlet: ['Erzincan Binali Yıldırım Üniversitesi'] },
  'Erzurum': { devlet: ['Atatürk Üniversitesi', 'Erzurum Teknik Üniversitesi'] },
  'Eskişehir': {
    devlet: ['Eskişehir Osmangazi Üniversitesi', 'Anadolu Üniversitesi', 'Eskişehir Teknik Üniversitesi'],
  },
  'Gaziantep': {
    devlet: ['Gaziantep Üniversitesi', 'Gaziantep İslam Bilim ve Teknoloji Üniversitesi'],
    vakif: ['Hasan Kalyoncu Üniversitesi', 'Sanko Üniversitesi'],
  },
  'Giresun': { devlet: ['Giresun Üniversitesi'] },
  'Gümüşhane': { devlet: ['Gümüşhane Üniversitesi'] },
  'Hakkari': { devlet: ['Hakkari Üniversitesi'] },
  'Hatay': { devlet: ['Hatay Mustafa Kemal Üniversitesi', 'İskenderun Teknik Üniversitesi'] },
  'Iğdır': { devlet: ['Iğdır Üniversitesi'] },
  'Isparta': { devlet: ['Süleyman Demirel Üniversitesi', 'Isparta Uygulamalı Bilimler Üniversitesi'] },
  'İstanbul': {
    devlet: [
      'İstanbul Üniversitesi',
      'İstanbul Üniversitesi-Cerrahpaşa',
      'İstanbul Teknik Üniversitesi',
      'Boğaziçi Üniversitesi',
      'Marmara Üniversitesi',
      'Yıldız Teknik Üniversitesi',
      'Mimar Sinan Güzel Sanatlar Üniversitesi',
      'Galatasaray Üniversitesi',
      'İstanbul Medeniyet Üniversitesi',
      'Türk-Alman Üniversitesi',
    ],
    vakif: [
      'Koç Üniversitesi',
      'Sabancı Üniversitesi',
      'Bahçeşehir Üniversitesi',
      'İstanbul Bilgi Üniversitesi',
      'Yeditepe Üniversitesi',
      'Kadir Has Üniversitesi',
      'Işık Üniversitesi',
      'Maltepe Üniversitesi',
      'Özyeğin Üniversitesi',
      'İstanbul Aydın Üniversitesi',
      'İstanbul Kültür Üniversitesi',
      'İstanbul Ticaret Üniversitesi',
      'İstanbul Arel Üniversitesi',
      'İstanbul Gelişim Üniversitesi',
      'İstanbul Kent Üniversitesi',
      'İstanbul Medipol Üniversitesi',
      'İstanbul Okan Üniversitesi',
      'İstanbul Sabahattin Zaim Üniversitesi',
      'İstanbul 29 Mayıs Üniversitesi',
      'Acıbadem Mehmet Ali Aydınlar Üniversitesi',
      'Altınbaş Üniversitesi',
      'Beykent Üniversitesi',
      'Biruni Üniversitesi',
      'Doğuş Üniversitesi',
      'Fatih Sultan Mehmet Vakıf Üniversitesi',
      'Haliç Üniversitesi',
      'İbn Haldun Üniversitesi',
      'Nişantaşı Üniversitesi',
      'Piri Reis Üniversitesi',
      'Üsküdar Üniversitesi',
      'Beykoz Üniversitesi',
      'İstinye Üniversitesi',
      'Bezmialem Vakıf Üniversitesi',
      'Demiroğlu Bilim Üniversitesi',
      'İstanbul Atlas Üniversitesi',
      'İstanbul Esenyurt Üniversitesi',
      'İstanbul Rumeli Üniversitesi',
      'İstanbul Topkapı Üniversitesi',
      'Türk Hava Kurumu Üniversitesi',
    ],
  },
  'İzmir': {
    devlet: [
      'Ege Üniversitesi',
      'Dokuz Eylül Üniversitesi',
      'İzmir Yüksek Teknoloji Enstitüsü',
      'İzmir Kâtip Çelebi Üniversitesi',
      'İzmir Bakırçay Üniversitesi',
      'İzmir Demokrasi Üniversitesi',
    ],
    vakif: ['Yaşar Üniversitesi', 'İzmir Ekonomi Üniversitesi', 'İzmir Tınaztepe Üniversitesi'],
  },
  'Kahramanmaraş': {
    devlet: ['Kahramanmaraş Sütçü İmam Üniversitesi', 'Kahramanmaraş İstiklal Üniversitesi'],
  },
  'Karabük': { devlet: ['Karabük Üniversitesi'] },
  'Karaman': { devlet: ['Karamanoğlu Mehmetbey Üniversitesi'] },
  'Kars': { devlet: ['Kafkas Üniversitesi'] },
  'Kastamonu': { devlet: ['Kastamonu Üniversitesi'] },
  'Kayseri': {
    devlet: ['Erciyes Üniversitesi', 'Kayseri Üniversitesi'],
    vakif: ['Nuh Naci Yazgan Üniversitesi', 'Kapadokya Üniversitesi'],
  },
  'Kırıkkale': { devlet: ['Kırıkkale Üniversitesi'] },
  'Kırklareli': { devlet: ['Kırklareli Üniversitesi'] },
  'Kırşehir': { devlet: ['Kırşehir Ahi Evran Üniversitesi'] },
  'Kilis': { devlet: ['Kilis 7 Aralık Üniversitesi'] },
  'Kocaeli': {
    devlet: ['Kocaeli Üniversitesi', 'Gebze Teknik Üniversitesi', 'Kocaeli Sağlık ve Teknoloji Üniversitesi'],
  },
  'Konya': {
    devlet: ['Selçuk Üniversitesi', 'Necmettin Erbakan Üniversitesi', 'Konya Teknik Üniversitesi'],
    vakif: ['KTO Karatay Üniversitesi', 'Konya Gıda ve Tarım Üniversitesi'],
  },
  'Kütahya': {
    devlet: ['Kütahya Dumlupınar Üniversitesi', 'Kütahya Sağlık Bilimleri Üniversitesi'],
  },
  'Malatya': {
    devlet: ['İnönü Üniversitesi', 'Malatya Turgut Özal Üniversitesi'],
  },
  'Manisa': { devlet: ['Manisa Celâl Bayar Üniversitesi'] },
  'Mardin': { devlet: ['Mardin Artuklu Üniversitesi'] },
  'Mersin': {
    devlet: ['Mersin Üniversitesi', 'Tarsus Üniversitesi'],
    vakif: ['Toros Üniversitesi', 'Çağ Üniversitesi'],
  },
  'Muğla': { devlet: ['Muğla Sıtkı Koçman Üniversitesi'] },
  'Muş': { devlet: ['Muş Alparslan Üniversitesi'] },
  'Nevşehir': { devlet: ['Nevşehir Hacı Bektaş Veli Üniversitesi'] },
  'Niğde': { devlet: ['Niğde Ömer Halisdemir Üniversitesi'] },
  'Ordu': { devlet: ['Ordu Üniversitesi'] },
  'Osmaniye': { devlet: ['Osmaniye Korkut Ata Üniversitesi'] },
  'Rize': { devlet: ['Recep Tayyip Erdoğan Üniversitesi'] },
  'Sakarya': {
    devlet: ['Sakarya Üniversitesi', 'Sakarya Uygulamalı Bilimler Üniversitesi'],
  },
  'Samsun': {
    devlet: ['Ondokuz Mayıs Üniversitesi', 'Samsun Üniversitesi'],
  },
  'Siirt': { devlet: ['Siirt Üniversitesi'] },
  'Sinop': { devlet: ['Sinop Üniversitesi'] },
  'Sivas': {
    devlet: ['Sivas Cumhuriyet Üniversitesi', 'Sivas Bilim ve Teknoloji Üniversitesi'],
  },
  'Şanlıurfa': { devlet: ['Harran Üniversitesi'] },
  'Şırnak': { devlet: ['Şırnak Üniversitesi'] },
  'Tekirdağ': { devlet: ['Tekirdağ Namık Kemal Üniversitesi'] },
  'Tokat': { devlet: ['Tokat Gaziosmanpaşa Üniversitesi'] },
  'Trabzon': {
    devlet: ['Karadeniz Teknik Üniversitesi', 'Trabzon Üniversitesi'],
    vakif: ['Avrasya Üniversitesi'],
  },
  'Tunceli': { devlet: ['Munzur Üniversitesi'] },
  'Uşak': { devlet: ['Uşak Üniversitesi'] },
  'Van': { devlet: ['Van Yüzüncü Yıl Üniversitesi'] },
  'Yalova': { devlet: ['Yalova Üniversitesi'] },
  'Yozgat': { devlet: ['Yozgat Bozok Üniversitesi'] },
  'Zonguldak': { devlet: ['Zonguldak Bülent Ecevit Üniversitesi'] },
}

/** Düz liste — seed ve arama bunu kullanır */
export const UNIVERSITIES: UniversityDef[] = Object.entries(BY_PROVINCE).flatMap(
  ([province, groups]) => [
    ...groups.devlet.map(name => ({ name, province, kind: 'DEVLET' as const })),
    ...(groups.vakif ?? []).map(name => ({ name, province, kind: 'VAKIF' as const })),
  ]
)

export function universitiesOfProvince(province: string): UniversityDef[] {
  return UNIVERSITIES.filter(u => u.province === province)
}

export const UNIVERSITY_COUNT = UNIVERSITIES.length

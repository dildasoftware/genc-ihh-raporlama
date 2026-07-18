# 🏛️ GENÇ İHH Raporlama Sistemi

> **Saha Verilerinin Dinamik Takibi, Doğru Planlama ve Güçlü Teşkilatlanma Stratejisi**

Genç İHH'nin Türkiye genelindeki saha operasyonlarını kurum bazlı detaylı takip eden, analiz eden ve raporlayan modern web uygulaması. Sistemdeki her sayı kaynağına kadar izlenebilir: karnedeki bir puandan, o puanı üreten tek tek faaliyet kayıtlarına inilebilir.

## ✨ Özellikler

### 📊 Veri Girişi
- **Soru bazlı haftalık form** — İl Yönetimi, Üniversite, Lise, Ortaokul ve Çocuk kategorileri ayrı sekmelerde; her soru "bu hafta hangi kurumlarda, kaç kişiyle yapıldı?" mantığıyla çalışır
- **Kurum satırı ekleme** — `+` ile kurum eklenir, katılımcı sayısı yazılır; lokasyon sayısı ve toplam katılım elle girilmez, satırlardan otomatik türetilir
- **Resmî üniversite listesi** — Üniversite adları YÖK listesinden seçilir (serbest metin kapalı); tutarsız yazımlar veriye giremez
- **İl Künyesi** — Nüfus, kurum sayıları, teşkilat kadrosu ve dönem hedefleri yılda bir girilir

### 🏆 Karne Sistemi
- **5 boyutlu puanlama** — Faaliyet Yoğunluğu, Katılım, Kapsam, Süreklilik, Teşkilat; ağırlıklı toplamdan harf notu (AA–DC) üretilir
- **Ulusal ve bölge sıralaması** — Sıralama daima ülke genelinde hesaplanır, görünürlük role göre kısıtlanır
- **Kurum kırılımı** — Hangi üniversitede/lisede kaç kişiyle ne yapıldığı, fakülte detayına kadar
- **Otomatik değerlendirme** — Güçlü/zayıf yönler puanlardan deterministik olarak çıkarılır

### 📈 Analiz Araçları
- **Faaliyet Kayıtları** — Her sayının kaynağı; yıl/hafta/il/birim/faaliyet türü filtreleriyle ham kayıtlara drill-down
- **Karşılaştır** — İl veya bölge bazında çoklu seçimle yan yana karşılaştırma, metrik ve trend grafikleri
- **Trend** — Haftalık zaman serisi, aylık kırılımlar
- **Haftalık Rapor** — Seçilen haftanın il/bölge/ülke özeti
- **AI Analiz** — İsteğe bağlı yapay zeka yorumu (OpenRouter üzerinden); üretilen her analiz kalıcı kayda dönüşür

### 🗄️ Arşiv
- Üretilen her rapor, karne ve AI analizi **veri anlık görüntüsü (snapshot)** olarak kalıcı saklanır
- Tür/il/bölge/yıl/tarih aralığı filtreleri, tam metin arama, sayfalama
- Arşivlenen kayıt silinmez; istenildiğinde geri yüklenir ve kaydedildiği andaki hâliyle yeniden açılır
- PDF çıktısı tarayıcının yerleşik yazdırma motoruyla alınır (vektörel metin, doğru sayfalama)

### 🔐 Yetkilendirme
| Rol | Yetki |
|-----|-------|
| `ADMIN` | Sistem Yöneticisi: tüm iller, tüm raporlar, tam yetki |
| `MERKEZ_BIRIM_BASKANI` | Genel Merkez: tüm iller, yalnız kendi birimi (ör. Üniversite) |
| `IL_KOORDINATOR` | İl Başkanı: yalnız kendi ili ve kendi kolu (K/E); veri girişi bu roldedir |

*Not: İller organizasyonel olarak 1.–4. Bölge altında gruplanır; bölgeler raporlamada kırılım olarak kullanılır, ayrı bir bölge yetki hesabı yoktur.*

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **Grafikler** | Recharts |
| **Veritabanı** | PostgreSQL (Neon Serverless) |
| **ORM** | Prisma 7 |
| **Auth** | NextAuth.js |
| **AI Analiz** | OpenRouter API (varsayılan model: Claude Sonnet 4) |
| **PDF Çıktı** | Tarayıcı yerleşik yazdırma (native print) + özel print CSS |

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı (önerilen: [Neon](https://neon.tech))

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, OPENROUTER_API_KEY, AI_MODEL

# 3. Veritabanı migration
npx prisma migrate dev

# 4. Referans verileri (bölgeler, iller, birimler, resmî üniversite listesi, test kullanıcıları)
npx prisma db seed

# 5. (Opsiyonel) Zengin demo verisi — 12 il × 13 hafta faaliyet + künye + arşiv örnekleri
npx tsx prisma/demo-data.ts

# 6. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

> ⚠️ `demo-data.ts` mevcut faaliyet kayıtlarını silip yeniden üretir — yalnız demo/geliştirme ortamında çalıştırın.

## 📁 Proje Yapısı

```
├── app/
│   ├── api/
│   │   ├── activities/          # Faaliyet listesi (filtre + sayfalama) ve kayıt
│   │   ├── ai-analiz/           # AI analiz üretimi (OpenRouter)
│   │   ├── haftalik-rapor/      # Haftalık özet raporu
│   │   ├── institutions/search  # Kurum autocomplete
│   │   ├── karne/               # Karne listesi + il detay/karşılaştırma
│   │   ├── kesif/               # Gruplu özetler (Karşılaştır sayfasını besler)
│   │   ├── province-report/     # İl künyesi (yıllık statik veriler)
│   │   ├── reports/             # Kalıcı rapor arşivi (kaydet/ara/arşivle/geri yükle)
│   │   ├── trend/               # Zaman serisi
│   │   └── weekly-entry/        # Soru bazlı haftalık form → Activity kayıtları
│   ├── arsiv/                   # Arşiv listesi + snapshot görüntüleyici
│   ├── faaliyetler/             # Ham kayıt drill-down
│   ├── haftalik-rapor/          # Haftalık rapor ekranı
│   ├── karne/                   # Karne listesi + il detay karnesi
│   ├── karsilastir/             # İl/bölge karşılaştırma çalışma alanı
│   ├── panel/                   # Rol bazlı dashboard
│   ├── trend/                   # Trend ekranı
│   └── veri-girisi/             # Haftalık soru formu + İl Künyesi
├── components/
│   ├── shared/                  # AppShell, Sidebar, Providers
│   └── ui/                      # shadcn/ui bileşenleri
├── lib/
│   ├── ai.ts / ai-prompts.ts    # AI servis katmanı ve sistem promptları
│   ├── auth.ts / authz.ts       # NextAuth yapılandırması ve rol bazlı kapsama
│   ├── chart-colors.ts          # Doğrulanmış grafik paleti (CVD-güvenli)
│   ├── karne.ts / karne-data.ts # 5 boyutlu puanlama motoru ve veri toplama
│   ├── questions.ts             # Haftalık form soru katalogu (tek doğruluk kaynağı)
│   ├── reports.ts               # Arşiv/rapor tür tanımları ve snapshot yardımcıları
│   ├── universities.ts          # Resmî YÖK üniversite listesi (il eşleşmeli)
│   └── prisma.ts / utils.ts     # DB bağlantısı, yardımcılar
└── prisma/
    ├── schema.prisma            # Veri modeli
    ├── seed.ts                  # Referans veriler + test kullanıcıları
    └── demo-data.ts             # Deterministik zengin demo veri üreticisi
```

## 📄 Lisans

Bu proje İHH İnsani Yardım Vakfı Genç İHH birimi için hackathon kapsamında geliştirilmiştir.

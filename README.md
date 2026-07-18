# 🏛️ GENÇ İHH Raporlama Sistemi

> **Saha Verilerinin Dinamik Takibi, Doğru Planlama ve Güçlü Teşkilatlanma Stratejisi**

Genç İHH'nin Türkiye genelindeki saha operasyonlarını kurum bazlı detaylı takip eden, analiz eden ve raporlayan modern web uygulaması.

## ✨ Özellikler

### 📊 Veri Girişi
- **Soru bazlı 6-sekmeli form** — Üniversite, Lise, Ortaokul ve Çocuk kategorileri ayrı
- **Kurum bazlı detaylı veri** — Hangi üniversitede, kaç kişiyle, ne yapıldığı
- **Autocomplete kurum arama** — 2 harf yazınca kurumlar otomatik gelir
- **Dinamik kurum ekleme/silme** — + butonu ile kurum ekleyip faaliyet kaydetme

### 🏆 Karne Sistemi
- **İl bazlı ağırlıklı puanlama** — Birim ve faaliyet türüne göre sıralama
- **Renkli grafikler** — Recharts ile bar, radar, pie chart
- **Detay karnesi** — Her il için teşkilat durumu, birim puanları, ilçe çalışmaları
- **PDF export** — html2canvas + jsPDF ile profesyonel PDF indirme

### 📈 Analiz Araçları
- **Keşif** — Çok boyutlu filtreleme ile veri keşfi
- **Trend** — Zaman serisi analizi, aylık/haftalık kırılımlar
- **Karşılaştır** — İl-il karşılaştırma radar grafikleri
- **AI Analiz** — Gemini AI ile doğal dilde veri analizi

### 🔐 Yetkilendirme
| Rol | Yetki |
|-----|-------|
| `ADMIN` | Sistem Yöneticisi: Tüm iller, tüm raporlar, tam yetki |
| `MERKEZ_BIRIM_BASKANI` | Genel Merkez: Tüm iller (sadece kendi birimi), tüm analizlere erişim |
| `IL_KOORDINATOR` | İl Başkanı: Sadece kendi iline veri girişi ve kendi ilinin analizleri |

*(Not: Sistemin bölge yapılandırması coğrafi değil, organizasyonel 1. Bölge, 2. Bölge, 3. Bölge ve 4. Bölge olarak çalışmaktadır.)*

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **Grafikler** | Recharts |
| **Veritabanı** | PostgreSQL (Neon Serverless) |
| **ORM** | Prisma |
| **Auth** | NextAuth.js |
| **AI Analiz** | Google Gemini 2.0 Flash API |
| **PDF Çıktı** | html2canvas + jsPDF |

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı (önerilen: [Neon](https://neon.tech))

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle (DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_GEMINI_API_KEY)

# 3. Veritabanı migration
npx prisma migrate dev

# 4. Seed data (opsiyonel demo verisi oluşturmak için)
npx prisma db seed

# 5. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📁 Proje Yapısı

```
├── app/
│   ├── api/                    # REST API endpoints
│   │   ├── activities/         # Faaliyet CRUD
│   │   ├── ai-analiz/          # Gemini API entegrasyonu (smart-report, ai-karne)
│   │   ├── karne/              # Karne algoritmaları
│   │   ├── province-report/    # İl detay verileri
│   │   └── institutions/search # Kurum arama
│   ├── ai-analiz/              # Yapay zeka veri asistanı
│   ├── arsiv/                  # Akıllı karne ve analiz arşivi
│   ├── faaliyetler/            # Faaliyet kayıt listesi
│   ├── haftalik-rapor/         # Haftalık özet raporlar
│   ├── karne/                  # Karne sistemi ve PDF çıktıları
│   ├── karsilastir/            # İl/Bölge karşılaştırma
│   ├── panel/                  # Dashboard
│   ├── trend/                  # Zaman serisi trendleri
│   └── veri-girisi/            # Veri giriş formları
├── components/
│   ├── shared/                 # Navbar, Sidebar, Layout bileşenleri
│   └── ui/                     # shadcn/ui hazır bileşenler
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── authz.ts                # Rol tabanlı yetkilendirme algoritmaları
│   ├── gemini.ts               # Yapay zeka servis katmanı
│   ├── prisma.ts               # DB bağlantısı
│   └── utils.ts                # Yardımcı fonksiyonlar
└── prisma/
    ├── schema.prisma           # Veri modeli
    └── seed.ts                 # Seed data
```

## 📄 Lisans

Bu proje İHH İnsani Yardım Vakfı Genç İHH birimi için hackathon kapsamında geliştirilmiştir.

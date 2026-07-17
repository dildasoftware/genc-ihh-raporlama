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
| `ADMIN` | Tüm iller, tüm veriler |
| `MERKEZ_BIRIM_BASKANI` | Tüm iller, kendi birimi |
| `BOLGE_KOORDINATOR` | Kendi bölgesi |
| `IL_KOORDINATOR` | Kendi ili, veri girişi |

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **Grafikler** | Recharts |
| **Veritabanı** | PostgreSQL (Neon Serverless) |
| **ORM** | Prisma 7 |
| **Auth** | NextAuth.js |
| **AI** | Google Gemini API |
| **PDF** | html2canvas + jsPDF |

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
# .env dosyasını düzenle

# 3. Veritabanı migration
npx prisma migrate dev

# 4. Seed data (opsiyonel)
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
│   │   ├── karne/              # Karne puanlama
│   │   ├── province-report/    # İl rapor verisi
│   │   └── institutions/search # Kurum arama
│   ├── veri-girisi/            # Veri giriş formları
│   ├── karne/                  # Karne sistemi
│   │   └── [provinceId]/       # İl detay karnesi
│   ├── kesif/                  # Keşif analizi
│   ├── trend/                  # Trend analizi
│   ├── karsilastir/            # İl karşılaştırma
│   └── panel/                  # Dashboard
├── components/
│   ├── shared/                 # AppShell, Sidebar
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── authz.ts                # Rol tabanlı yetkilendirme
│   ├── prisma.ts               # DB bağlantısı
│   └── utils.ts                # Yardımcı fonksiyonlar
└── prisma/
    ├── schema.prisma           # Veri modeli
    └── seed.ts                 # Seed data
```

## 📄 Lisans

Bu proje İHH İnsani Yardım Vakfı Genç İHH birimi için hackathon kapsamında geliştirilmiştir.

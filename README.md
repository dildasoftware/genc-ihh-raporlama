# 🏛️ GENÇ İHH AI Destekli Raporlama ve Analiz Sistemi (ATOM Hackathon)

> **Saha Verilerinin Dinamik Takibi, Doğru Planlama ve Güçlü Teşkilatlanma Stratejisi**

## 📖 Proje Özeti

Sivil toplum kuruluşlarının (Örn: Genç İHH) saha operasyonlarında karşılaştığı en büyük problemlerden biri, verilerin manuel ve dağınık (Excel, WhatsApp vb.) toplanmasıdır. Bu durum veri karmaşasına, raporların gecikmesine ve sahanın gerçek performansının merkez tarafından net okunamamasına neden olur. 

Geliştirdiğimiz bu proje; Türkiye genelindeki saha operasyonlarını (Kadın Kolu, Erkek Kolu, Lise, Üniversite vb.) hiyerarşik olarak takip eden, analiz eden ve raporlayan **yapay zeka (LLM) destekli modern bir web uygulamasıdır**. 

Sistemimiz sayesinde il koordinatörleri verilerini saniyeler içinde girebilir, Genel Merkez yetkilileri ise bu verileri dinamik Türkiye haritası üzerinde anlık olarak izleyebilir. Projemizin en büyük inovasyonu ise; salt veri depolamak yerine, **Yapay Zeka (AI) destekli analiz motoru** ile geçmiş verileri okuyup yöneticilere "Stratejik Özetler" ve "Adil Karne Puanları" sunan bir **Karar Destek Sistemi** olmasıdır.

## 🚀 Canlı Demo & Bağlantılar

* **Canlı URL (Production):** [https://genc-ihh-raporlama-kpjy-iota.vercel.app/login](https://genc-ihh-raporlama-kpjy-iota.vercel.app/login)
* **Sunum Dosyası / Video:** [Google Drive Bağlantısı](https://drive.google.com/drive/folders/17L0QGw6_C7iCWAyzYKj1gGssr7pAoCWK?usp=drive_link)

*(Not: Sisteme test kullanıcıları ile giriş yapabilirsiniz. Örn: E-posta: `admin@test.com`, Parola: `Test1234!`)*

## 👥 Takım Üyeleri (Fatih'in Sultanları)

* **Sudenur Öztürk** - Teknik Lider / Geliştirici (Development & Architecture)
* **Dilara Bilişik** - Tasarım Lideri Sunum (UI/UX Design)
* **Öznur Çağlayan** - Sunum (Presentation & Pitch)

## 🛠️ Kullanılan Teknolojiler

Projemiz, güncel "Full-Stack Serverless" mimarisi ile uçtan uca ölçeklenebilir şekilde tasarlanmıştır.

| Katman | Teknoloji | Açıklama |
|--------|-----------|-----------|
| **Frontend & Backend** | `Next.js 16 (App Router)`, `React 19`, `TypeScript` | Sunucusuz API Routes ve modern arayüz mimarisi. |
| **Styling & UI** | `Tailwind CSS 4`, `shadcn/ui` | Responsive, erişilebilir ve modern komponentler. |
| **Veritabanı** | `PostgreSQL (Neon DB)` | Ölçeklenebilir Serverless ilişkisel veritabanı. |
| **ORM** | `Prisma 7` | Tip-güvenli (Type-safe) veritabanı sorguları. |
| **Kimlik Doğrulama** | `NextAuth.js` | Rol bazlı (RBAC) güvenli erişim kontrolü. |
| **Yapay Zeka (AI)** | `OpenRouter API (Claude 3.5 Sonnet)` | Dinamik veri analizi ve rapor özetleme. |

## ⚙️ Kurulum Adımları (Local Setup)

Projeyi kendi bilgisayarınızda (yerel ortamda) ayağa kaldırmak için aşağıdaki adımları sırasıyla uygulayınız.

### 1. Gereksinimler
* Node.js (v18 veya üzeri)
* Git
* PostgreSQL veritabanı (Önerilen: Neon.tech)

### 2. Kurulum Komutları

```bash
# 1. Repoyu bilgisayarınıza klonlayın ve klasöre girin
git clone https://github.com/dildasoftware/genc-ihh-raporlama.git
cd genc-ihh-raporlama

# 2. Proje bağımlılıklarını yükleyin
npm install

# 3. Ortam değişkenleri dosyasını kopyalayın
cp .env.example .env.local
```

### 3. Çevre Değişkenlerini Ayarlama
Oluşturduğunuz `.env.local` dosyasını açın ve aşağıdaki değerleri kendi ortamınıza göre doldurun:
```env
DATABASE_URL="postgresql://kullanici:sifre@host:port/veritabani"
NEXTAUTH_SECRET="kendi-gizli-anahtariniz"
NEXTAUTH_URL="http://localhost:3000"
OPENROUTER_API_KEY="sk-or-v1-..."
AI_MODEL="anthropic/claude-3.5-sonnet"
```

### 4. Veritabanını Hazırlama ve Projeyi Başlatma

```bash
# 1. Veritabanı tablolarını oluşturun
npx prisma db push

# 2. Prisma Client'ı oluşturun
npx prisma generate

# 3. Rolleri, illeri ve demo test kullanıcılarını veritabanına ekleyin
npx tsx prisma/seed.ts

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

Uygulama başarıyla başlatıldıktan sonra tarayıcınızdan `http://localhost:3000` adresine giderek projeyi test edebilirsiniz.

## 📊 Öne Çıkan Mühendislik Pratikleri
* **Immutable Arşiv (Snapshot):** İl koordinatörleri tarafından gönderilen haftalık raporlar veritabanında "JSON Snapshot" olarak dondurulur. Geçmiş raporların sonradan değiştirilmesi (veri manipülasyonu) mimari olarak engellenmiştir.
* **Rol Bazlı Yetkilendirme (RBAC):** İl Koordinatörü sadece kendi iline veri girebilirken, Genel Merkez tüm illerin istatistiklerini harita üzerinden karşılaştırmalı olarak görebilir.
* **Serverless Mimari:** Uygulama ve veritabanı kullanılmadığı anlarda uyku moduna geçer (Scale-to-zero), trafik anında ise anlık olarak yük dengeler. Bu sayede işletme maliyeti sıfıra yakındır.

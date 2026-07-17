import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local dosyasından DATABASE_URL'yi yükle (override ile .env'den önce gelir)
config({ path: ".env.local", override: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL ortam değişkeni tanımlı değil. .env.local dosyasını kontrol edin.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});

import "dotenv/config";
import { defineConfig } from "prisma/config";

const DATABASE_URL = "postgresql://neondb_owner:npg_67PxFCtyLBVM@ep-crimson-thunder-asjny3vf-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";

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

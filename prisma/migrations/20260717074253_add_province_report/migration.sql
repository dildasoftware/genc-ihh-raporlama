-- CreateTable
CREATE TABLE "province_reports" (
    "id" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "population" INTEGER,
    "districtCount" INTEGER,
    "studentCount" INTEGER,
    "universityCount" INTEGER,
    "highSchoolCount" INTEGER,
    "middleSchoolCount" INTEGER,
    "kykCount" INTEGER,
    "dormCount" INTEGER,
    "universityData" JSONB,
    "highSchoolData" JSONB,
    "middleSchoolData" JSONB,
    "childData" JSONB,
    "orgStatus" JSONB,
    "totalDistrictCount" INTEGER,
    "ihhDistrictCount" INTEGER,
    "gencIhhDistrictCount" INTEGER,
    "targets" JSONB,
    "totalScore" DOUBLE PRECISION,
    "ranking" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "province_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "province_reports_year_idx" ON "province_reports"("year");

-- CreateIndex
CREATE UNIQUE INDEX "province_reports_provinceId_year_key" ON "province_reports"("provinceId", "year");

-- AddForeignKey
ALTER TABLE "province_reports" ADD CONSTRAINT "province_reports_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "province_reports" ADD CONSTRAINT "province_reports_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

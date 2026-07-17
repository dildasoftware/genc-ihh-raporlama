-- AlterTable
ALTER TABLE "ai_insights" ADD COLUMN     "scopeName" TEXT,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "genderScope" TEXT,
ADD COLUMN     "scopeName" TEXT,
ADD COLUMN     "snapshotJson" JSONB,
ADD COLUMN     "summaryJson" JSONB,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "filePath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ai_insights_scopeId_year_idx" ON "ai_insights"("scopeId", "year");

-- CreateIndex
CREATE INDEX "ai_insights_deletedAt_idx" ON "ai_insights"("deletedAt");

-- CreateIndex
CREATE INDEX "reports_scopeId_year_idx" ON "reports"("scopeId", "year");

-- CreateIndex
CREATE INDEX "reports_deletedAt_idx" ON "reports"("deletedAt");

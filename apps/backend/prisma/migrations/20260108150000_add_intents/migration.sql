-- Manual intent creation baseline for R1.0.

CREATE TYPE "IntentStage" AS ENUM ('NEW', 'CLARIFY', 'MATCH', 'COMMIT', 'WON', 'LOST');
CREATE TYPE "IntentSource" AS ENUM ('manual', 'paste', 'email');

CREATE TABLE "Intent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "context" TEXT,
    "scope" TEXT,
    "kpi" TEXT,
    "risks" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "stage" "IntentStage" NOT NULL DEFAULT 'NEW',
    "confidentialityLevel" "ConfidentialityLevel" NOT NULL DEFAULT 'L1',
    "source" "IntentSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Intent_orgId_idx" ON "Intent"("orgId");
CREATE INDEX "Intent_orgId_stage_idx" ON "Intent"("orgId", "stage");
CREATE INDEX "Intent_createdByUserId_idx" ON "Intent"("createdByUserId");

ALTER TABLE "Intent" ADD CONSTRAINT "Intent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Intent" ADD CONSTRAINT "Intent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

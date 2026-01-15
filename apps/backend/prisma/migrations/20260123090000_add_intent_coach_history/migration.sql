-- Intent Coach run history + per-field suggestion metadata.

CREATE TABLE "IntentCoachRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "summaryItems" JSONB NOT NULL,
    "instructions" TEXT,
    "focusFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntentCoachRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntentCoachRun_orgId_intentId_createdAt_idx" ON "IntentCoachRun"("orgId", "intentId", "createdAt");
CREATE INDEX "IntentCoachRun_intentId_createdAt_idx" ON "IntentCoachRun"("intentId", "createdAt");

ALTER TABLE "IntentCoachRun" ADD CONSTRAINT "IntentCoachRun_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntentCoachRun" ADD CONSTRAINT "IntentCoachRun_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvatarSuggestion" ADD COLUMN "coachRunId" TEXT;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "targetField" TEXT;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "actionable" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "AvatarSuggestion_coachRunId_idx" ON "AvatarSuggestion"("coachRunId");

ALTER TABLE "AvatarSuggestion" ADD CONSTRAINT "AvatarSuggestion_coachRunId_fkey"
FOREIGN KEY ("coachRunId") REFERENCES "IntentCoachRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

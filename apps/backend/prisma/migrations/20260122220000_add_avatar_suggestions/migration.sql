-- Avatar suggestions for Intent Coach flow.

CREATE TYPE "AvatarType" AS ENUM ('SYSTEM', 'ORG_X', 'INTENT_COACH');

CREATE TYPE "AvatarSuggestionKind" AS ENUM ('missing_info', 'question', 'risk', 'rewrite', 'summary');

CREATE TYPE "AvatarSuggestionStatus" AS ENUM ('ISSUED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "AvatarSuggestion" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "avatarType" "AvatarType" NOT NULL,
    "kind" "AvatarSuggestionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "l1Text" TEXT,
    "evidenceRef" TEXT,
    "proposedPatch" JSONB,
    "status" "AvatarSuggestionStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    CONSTRAINT "AvatarSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvatarSuggestion_orgId_intentId_createdAt_idx" ON "AvatarSuggestion"("orgId", "intentId", "createdAt");
CREATE INDEX "AvatarSuggestion_intentId_status_idx" ON "AvatarSuggestion"("intentId", "status");
CREATE INDEX "AvatarSuggestion_orgId_status_idx" ON "AvatarSuggestion"("orgId", "status");

ALTER TABLE "AvatarSuggestion" ADD CONSTRAINT "AvatarSuggestion_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvatarSuggestion" ADD CONSTRAINT "AvatarSuggestion_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Matching engine MVP: intent fields + match list + feedback.

CREATE TYPE "MatchFeedbackRating" AS ENUM (
  'UP',
  'DOWN'
);

ALTER TABLE "Intent"
ADD COLUMN "tech" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "industry" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "region" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "budgetBucket" "ProviderBudgetBucket" NOT NULL DEFAULT 'UNKNOWN';

CREATE TABLE "MatchList" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "resultsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchFeedback" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "matchListId" TEXT NOT NULL,
    "candidateOrgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "rating" "MatchFeedbackRating" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchList_orgId_intentId_createdAt_idx" ON "MatchList"("orgId", "intentId", "createdAt");
CREATE INDEX "MatchList_orgId_createdAt_idx" ON "MatchList"("orgId", "createdAt");

CREATE INDEX "MatchFeedback_orgId_intentId_createdAt_idx" ON "MatchFeedback"("orgId", "intentId", "createdAt");
CREATE INDEX "MatchFeedback_orgId_matchListId_idx" ON "MatchFeedback"("orgId", "matchListId");
CREATE INDEX "MatchFeedback_candidateOrgId_createdAt_idx" ON "MatchFeedback"("candidateOrgId", "createdAt");

ALTER TABLE "MatchList" ADD CONSTRAINT "MatchList_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchList" ADD CONSTRAINT "MatchList_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchList" ADD CONSTRAINT "MatchList_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_matchListId_fkey"
FOREIGN KEY ("matchListId") REFERENCES "MatchList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_candidateOrgId_fkey"
FOREIGN KEY ("candidateOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

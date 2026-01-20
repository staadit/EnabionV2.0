-- System Avatar + Organization Avatar (light).

CREATE TYPE "AvatarSuggestionSubjectType" AS ENUM ('INTENT', 'USER', 'ORG');

ALTER TYPE "AvatarSuggestionKind" ADD VALUE 'lead_qualification';
ALTER TYPE "AvatarSuggestionKind" ADD VALUE 'next_step';

CREATE TYPE "LeadFitBand" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NO_FIT');
CREATE TYPE "LeadPriority" AS ENUM ('P1', 'P2', 'P3');

ALTER TABLE "AvatarSuggestion" ALTER COLUMN "intentId" DROP NOT NULL;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "subjectType" "AvatarSuggestionSubjectType" DEFAULT 'INTENT';
ALTER TABLE "AvatarSuggestion" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "ctas" JSONB;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "metadata" JSONB;
ALTER TABLE "AvatarSuggestion" ADD COLUMN "language" TEXT;

UPDATE "AvatarSuggestion"
SET "subjectId" = "intentId"
WHERE "subjectId" IS NULL AND "intentId" IS NOT NULL;

CREATE INDEX "AvatarSuggestion_orgId_subjectType_subjectId_createdAt_idx"
ON "AvatarSuggestion"("orgId", "subjectType", "subjectId", "createdAt");

CREATE TABLE "UserOnboardingState" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "currentStep" TEXT,
    "completedSteps" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserOnboardingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserOnboardingState_orgId_userId_version_key"
ON "UserOnboardingState"("orgId", "userId", "version");
CREATE INDEX "UserOnboardingState_orgId_userId_idx"
ON "UserOnboardingState"("orgId", "userId");

ALTER TABLE "UserOnboardingState" ADD CONSTRAINT "UserOnboardingState_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserOnboardingState" ADD CONSTRAINT "UserOnboardingState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrgAvatarProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "profileVersion" TEXT NOT NULL,
    "markets" JSONB,
    "industries" JSONB,
    "clientTypes" JSONB,
    "servicePortfolio" JSONB,
    "techStack" JSONB,
    "excludedSectors" JSONB,
    "constraints" JSONB,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgAvatarProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgAvatarProfile_orgId_key" ON "OrgAvatarProfile"("orgId");

ALTER TABLE "OrgAvatarProfile" ADD CONSTRAINT "OrgAvatarProfile_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrgAvatarProfile" ADD CONSTRAINT "OrgAvatarProfile_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrgAvatarProfile" ADD CONSTRAINT "OrgAvatarProfile_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrgLeadQualification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "fitBand" "LeadFitBand" NOT NULL,
    "priority" "LeadPriority" NOT NULL,
    "reasons" JSONB,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgLeadQualification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgLeadQualification_orgId_intentId_key"
ON "OrgLeadQualification"("orgId", "intentId");
CREATE INDEX "OrgLeadQualification_orgId_fitBand_idx"
ON "OrgLeadQualification"("orgId", "fitBand");
CREATE INDEX "OrgLeadQualification_orgId_priority_idx"
ON "OrgLeadQualification"("orgId", "priority");

ALTER TABLE "OrgLeadQualification" ADD CONSTRAINT "OrgLeadQualification_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrgLeadQualification" ADD CONSTRAINT "OrgLeadQualification_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgLeadQualification" ADD CONSTRAINT "OrgLeadQualification_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrgLeadQualification" ADD CONSTRAINT "OrgLeadQualification_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

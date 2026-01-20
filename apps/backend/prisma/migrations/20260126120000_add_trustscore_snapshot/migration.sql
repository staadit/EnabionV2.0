-- TrustScore snapshot MVP.

CREATE TYPE "TrustScoreScope" AS ENUM (
  'GLOBAL'
);

ALTER TABLE "Organization"
ADD COLUMN "trustScoreLatestId" TEXT;

CREATE TABLE "TrustScoreSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectOrgId" TEXT NOT NULL,
    "scope" "TrustScoreScope" NOT NULL DEFAULT 'GLOBAL',
    "scoreOverall" INTEGER NOT NULL,
    "scoreProfile" INTEGER,
    "scoreResponsiveness" INTEGER,
    "scoreBehaviour" INTEGER,
    "statusLabel" TEXT NOT NULL,
    "explanationPublic" JSONB,
    "explanationInternal" JSONB,
    "triggerReason" TEXT,
    "actorUserId" TEXT,
    "algorithmVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrustScoreSnapshot_orgId_computedAt_idx" ON "TrustScoreSnapshot"("orgId", "computedAt");
CREATE INDEX "TrustScoreSnapshot_subjectOrgId_computedAt_idx" ON "TrustScoreSnapshot"("subjectOrgId", "computedAt");
CREATE INDEX "TrustScoreSnapshot_orgId_subjectOrgId_computedAt_idx" ON "TrustScoreSnapshot"("orgId", "subjectOrgId", "computedAt");
CREATE UNIQUE INDEX "Organization_trustScoreLatestId_key" ON "Organization"("trustScoreLatestId");

ALTER TABLE "TrustScoreSnapshot" ADD CONSTRAINT "TrustScoreSnapshot_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrustScoreSnapshot" ADD CONSTRAINT "TrustScoreSnapshot_subjectOrgId_fkey"
FOREIGN KEY ("subjectOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrustScoreSnapshot" ADD CONSTRAINT "TrustScoreSnapshot_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_trustScoreLatestId_fkey"
FOREIGN KEY ("trustScoreLatestId") REFERENCES "TrustScoreSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

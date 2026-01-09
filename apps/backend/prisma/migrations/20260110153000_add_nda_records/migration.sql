-- Add NDA documents and acceptance records.

CREATE TYPE "NdaType" AS ENUM ('MUTUAL');
CREATE TYPE "NdaChannel" AS ENUM ('ui', 'api');

CREATE TABLE "NdaDocument" (
    "id" TEXT NOT NULL,
    "ndaType" "NdaType" NOT NULL DEFAULT 'MUTUAL',
    "ndaVersion" TEXT NOT NULL,
    "enMarkdown" TEXT NOT NULL,
    "summaryPl" TEXT,
    "summaryDe" TEXT,
    "summaryNl" TEXT,
    "enHashSha256" CHAR(64) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NdaDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NdaDocument_ndaVersion_key" ON "NdaDocument"("ndaVersion");
CREATE INDEX "NdaDocument_ndaType_isActive_idx" ON "NdaDocument"("ndaType", "isActive");

CREATE TABLE "NdaAcceptance" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "counterpartyOrgId" TEXT,
    "ndaType" "NdaType" NOT NULL DEFAULT 'MUTUAL',
    "ndaVersion" TEXT NOT NULL,
    "enHashSha256" CHAR(64) NOT NULL,
    "acceptedByUserId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL,
    "channel" "NdaChannel" NOT NULL,
    "typedName" TEXT NOT NULL,
    "typedRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NdaAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NdaAcceptance_orgId_counterpartyOrgId_ndaType_ndaVersion_enHashSha256_key"
ON "NdaAcceptance"("orgId", "counterpartyOrgId", "ndaType", "ndaVersion", "enHashSha256");

CREATE INDEX "NdaAcceptance_acceptedByUserId_acceptedAt_idx"
ON "NdaAcceptance"("acceptedByUserId", "acceptedAt");

CREATE INDEX "NdaAcceptance_orgId_ndaType_ndaVersion_enHashSha256_idx"
ON "NdaAcceptance"("orgId", "ndaType", "ndaVersion", "enHashSha256");

ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

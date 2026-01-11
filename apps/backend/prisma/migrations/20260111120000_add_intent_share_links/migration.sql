-- Intent share links: tokenized L1-only share URLs with TTL + revoke.

CREATE TABLE "IntentShareLink" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "tokenHashSha256" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "lastAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IntentShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntentShareLink_tokenHashSha256_key" ON "IntentShareLink"("tokenHashSha256");
CREATE INDEX "IntentShareLink_orgId_intentId_idx" ON "IntentShareLink"("orgId", "intentId");
CREATE INDEX "IntentShareLink_expiresAt_idx" ON "IntentShareLink"("expiresAt");
CREATE INDEX "IntentShareLink_revokedAt_idx" ON "IntentShareLink"("revokedAt");

ALTER TABLE "IntentShareLink" ADD CONSTRAINT "IntentShareLink_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntentShareLink" ADD CONSTRAINT "IntentShareLink_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntentShareLink" ADD CONSTRAINT "IntentShareLink_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntentShareLink" ADD CONSTRAINT "IntentShareLink_revokedByUserId_fkey"
FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

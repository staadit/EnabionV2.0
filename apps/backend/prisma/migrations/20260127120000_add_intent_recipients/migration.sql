-- Intent recipients (Y/Z) sharing + NDA request tracking.

CREATE TYPE "IntentRecipientRole" AS ENUM ('Y', 'Z');
CREATE TYPE "IntentRecipientStatus" AS ENUM ('SENT', 'ACCEPTED', 'REVOKED');

CREATE TABLE "IntentRecipient" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "recipientOrgId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "recipientRole" "IntentRecipientRole" NOT NULL DEFAULT 'Y',
    "status" "IntentRecipientStatus" NOT NULL DEFAULT 'SENT',
    "ndaRequestedAt" TIMESTAMP(3),
    "ndaRequestedByOrgId" TEXT,
    "ndaRequestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntentRecipient_intentId_recipientOrgId_key" ON "IntentRecipient"("intentId", "recipientOrgId");
CREATE INDEX "IntentRecipient_recipientOrgId_createdAt_idx" ON "IntentRecipient"("recipientOrgId", "createdAt");
CREATE INDEX "IntentRecipient_intentId_createdAt_idx" ON "IntentRecipient"("intentId", "createdAt");
CREATE INDEX "IntentRecipient_senderOrgId_createdAt_idx" ON "IntentRecipient"("senderOrgId", "createdAt");

ALTER TABLE "IntentRecipient" ADD CONSTRAINT "IntentRecipient_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntentRecipient" ADD CONSTRAINT "IntentRecipient_recipientOrgId_fkey" FOREIGN KEY ("recipientOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntentRecipient" ADD CONSTRAINT "IntentRecipient_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntentRecipient" ADD CONSTRAINT "IntentRecipient_ndaRequestedByUserId_fkey" FOREIGN KEY ("ndaRequestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

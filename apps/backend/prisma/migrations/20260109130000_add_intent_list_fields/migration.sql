-- Add intent list fields and activity tracking.

ALTER TABLE "Intent"
ADD COLUMN "client" TEXT,
ADD COLUMN "ownerUserId" TEXT,
ADD COLUMN "language" TEXT,
ADD COLUMN "lastActivityAt" TIMESTAMP(3);

UPDATE "Intent"
SET "ownerUserId" = "createdByUserId"
WHERE "ownerUserId" IS NULL;

UPDATE "Intent" AS i
SET "language" = COALESCE(i."language", o."defaultLanguage")
FROM "Organization" AS o
WHERE i."orgId" = o."id"
  AND i."language" IS NULL;

UPDATE "Intent"
SET "lastActivityAt" = COALESCE("updatedAt", "createdAt")
WHERE "lastActivityAt" IS NULL;

ALTER TABLE "Intent"
ALTER COLUMN "language" SET NOT NULL,
ALTER COLUMN "language" SET DEFAULT 'EN',
ALTER COLUMN "lastActivityAt" SET NOT NULL,
ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Intent"
ADD CONSTRAINT "Intent_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Intent_orgId_lastActivityAt_idx" ON "Intent"("orgId", "lastActivityAt" DESC);
CREATE INDEX "Intent_orgId_ownerUserId_idx" ON "Intent"("orgId", "ownerUserId");
CREATE INDEX "Intent_orgId_language_idx" ON "Intent"("orgId", "language");
CREATE INDEX "Intent_orgId_stage_lastActivityAt_idx" ON "Intent"("orgId", "stage", "lastActivityAt" DESC);

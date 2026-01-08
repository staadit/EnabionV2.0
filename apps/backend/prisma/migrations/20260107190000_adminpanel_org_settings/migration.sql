-- Admin panel org settings + soft-deactivate members.

ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'EN';
ALTER TABLE "Organization" ADD COLUMN "policyAiEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "policyShareLinksEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "policyEmailIngestEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Organization"
SET "slug" = regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')
WHERE "slug" IS NULL;

UPDATE "Organization"
SET "slug" = trim(both '-' from "slug")
WHERE "slug" IS NOT NULL;

ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

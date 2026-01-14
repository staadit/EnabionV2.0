-- Add intentNumber sequence/column
CREATE SEQUENCE IF NOT EXISTS "Intent_intentNumber_seq";

ALTER TABLE "Intent" ADD COLUMN "intentNumber" INTEGER;
ALTER TABLE "Intent" ALTER COLUMN "intentNumber" SET DEFAULT nextval('"Intent_intentNumber_seq"');
UPDATE "Intent" SET "intentNumber" = nextval('"Intent_intentNumber_seq"') WHERE "intentNumber" IS NULL;
ALTER SEQUENCE "Intent_intentNumber_seq" OWNED BY "Intent"."intentNumber";
ALTER TABLE "Intent" ALTER COLUMN "intentNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Intent_intentNumber_key" ON "Intent"("intentNumber");

-- Add intentName (unique per org)
ALTER TABLE "Intent" ADD COLUMN "intentName" TEXT;
UPDATE "Intent"
SET "intentName" = 'Intent ' || lpad("intentNumber"::text, 7, '0')
WHERE "intentName" IS NULL;
ALTER TABLE "Intent" ALTER COLUMN "intentName" SET NOT NULL;
CREATE UNIQUE INDEX "Intent_orgId_intentName_key" ON "Intent"("orgId", "intentName");

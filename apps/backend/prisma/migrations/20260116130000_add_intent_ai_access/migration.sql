-- Add AI L2 access toggle fields on Intent.

ALTER TABLE "Intent"
ADD COLUMN "aiAllowL2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiAllowL2SetAt" TIMESTAMP(3),
ADD COLUMN "aiAllowL2SetByUserId" TEXT;

ALTER TABLE "Intent" ADD CONSTRAINT "Intent_aiAllowL2SetByUserId_fkey"
FOREIGN KEY ("aiAllowL2SetByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

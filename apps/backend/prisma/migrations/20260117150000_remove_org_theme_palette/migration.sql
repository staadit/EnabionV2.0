-- Remove per-tenant palette assignment.

ALTER TABLE "Organization" DROP CONSTRAINT "Organization_themePaletteId_fkey";
DROP INDEX "Organization_themePaletteId_idx";
ALTER TABLE "Organization" DROP COLUMN "themePaletteId";

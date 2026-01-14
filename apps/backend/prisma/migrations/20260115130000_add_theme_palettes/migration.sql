-- Theme palettes: admin-managed color tokens + per-tenant assignment.

CREATE TABLE "ThemePalette" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokensJson" JSONB NOT NULL,
    "isGlobalDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemePalette_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThemePalette_slug_key" ON "ThemePalette"("slug");
CREATE INDEX "ThemePalette_isGlobalDefault_idx" ON "ThemePalette"("isGlobalDefault");

ALTER TABLE "Organization" ADD COLUMN "themePaletteId" TEXT;
CREATE INDEX "Organization_themePaletteId_idx" ON "Organization"("themePaletteId");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_themePaletteId_fkey"
FOREIGN KEY ("themePaletteId") REFERENCES "ThemePalette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ThemePaletteRevision" (
    "id" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "tokensJson" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemePaletteRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThemePaletteRevision_paletteId_revision_key" ON "ThemePaletteRevision"("paletteId", "revision");
CREATE INDEX "ThemePaletteRevision_paletteId_createdAt_idx" ON "ThemePaletteRevision"("paletteId", "createdAt");

ALTER TABLE "ThemePaletteRevision" ADD CONSTRAINT "ThemePaletteRevision_paletteId_fkey"
FOREIGN KEY ("paletteId") REFERENCES "ThemePalette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

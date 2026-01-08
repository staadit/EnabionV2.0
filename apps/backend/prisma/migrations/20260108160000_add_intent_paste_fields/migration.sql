-- Add paste-source metadata fields to intents.

ALTER TABLE "Intent"
ADD COLUMN "title" TEXT,
ADD COLUMN "sourceTextRaw" TEXT,
ADD COLUMN "sourceTextSha256" CHAR(64),
ADD COLUMN "sourceTextLength" INTEGER;

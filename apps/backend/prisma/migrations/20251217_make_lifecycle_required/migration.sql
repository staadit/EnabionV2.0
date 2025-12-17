-- Align lifecycleStep/pipelineStage with validator (required) and add indexes.
ALTER TABLE "Event" ALTER COLUMN "lifecycleStep" SET DEFAULT 'CLARIFY';
UPDATE "Event" SET "lifecycleStep" = 'CLARIFY' WHERE "lifecycleStep" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "lifecycleStep" SET NOT NULL;

ALTER TABLE "Event" ALTER COLUMN "pipelineStage" SET DEFAULT 'NEW';
UPDATE "Event" SET "pipelineStage" = 'NEW' WHERE "pipelineStage" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "pipelineStage" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Event_correlationId_idx" ON "Event"("correlationId");
CREATE INDEX IF NOT EXISTS "Event_occurredAt_idx" ON "Event"("occurredAt");

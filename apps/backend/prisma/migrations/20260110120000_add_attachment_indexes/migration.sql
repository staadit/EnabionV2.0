-- Add attachment list index.

CREATE INDEX "Attachment_orgId_intentId_createdAt_idx"
ON "Attachment" ("orgId", "intentId", "createdAt");

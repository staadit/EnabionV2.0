-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorOrgId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "lifecycleStep" TEXT,
    "pipelineStage" TEXT,
    "channel" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Event_orgId_subjectId_type_occurredAt_idx" ON "Event"("orgId", "subjectId", "type", "occurredAt");

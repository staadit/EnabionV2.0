-- Blobstore baseline for R1.0: blobs and attachments with enums.

CREATE TYPE "ConfidentialityLevel" AS ENUM ('L1', 'L2', 'L3');
CREATE TYPE "BlobStorageDriver" AS ENUM ('local', 's3');
CREATE TYPE "AttachmentSource" AS ENUM ('email_ingest', 'manual_upload', 'export');

CREATE TABLE "Blob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storageDriver" "BlobStorageDriver" NOT NULL DEFAULT 'local',
    "objectKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "contentType" TEXT NOT NULL,
    "confidentiality" "ConfidentialityLevel" NOT NULL DEFAULT 'L1',
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionAlg" TEXT,
    "encryptionKeyId" TEXT,
    "encryptionIvB64" TEXT,
    "encryptionTagB64" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Blob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT,
    "source" "AttachmentSource" NOT NULL DEFAULT 'manual_upload',
    "filename" TEXT NOT NULL,
    "blobId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Blob_orgId_idx" ON "Blob"("orgId");
CREATE INDEX "Blob_orgId_objectKey_idx" ON "Blob"("orgId", "objectKey");
CREATE INDEX "Attachment_orgId_idx" ON "Attachment"("orgId");
CREATE INDEX "Attachment_intentId_idx" ON "Attachment"("intentId");

ALTER TABLE "Blob" ADD CONSTRAINT "Blob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "Blob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

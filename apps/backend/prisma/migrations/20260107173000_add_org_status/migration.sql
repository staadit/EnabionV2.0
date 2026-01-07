-- Add organization status (platform admin).

CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "Organization"
ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE';

-- Provider (Y) profile fields for Matching MVP.

CREATE TYPE "ProviderBudgetBucket" AS ENUM (
  'UNKNOWN',
  'LT_10K',
  'EUR_10K_50K',
  'EUR_50K_150K',
  'EUR_150K_500K',
  'GT_500K'
);

CREATE TYPE "ProviderTeamSizeBucket" AS ENUM (
  'UNKNOWN',
  'SOLO',
  'TEAM_2_10',
  'TEAM_11_50',
  'TEAM_51_200',
  'TEAM_201_PLUS'
);

ALTER TABLE "Organization"
ADD COLUMN "providerLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "providerRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "providerTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "providerBudgetBucket" "ProviderBudgetBucket" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "providerTeamSizeBucket" "ProviderTeamSizeBucket" NOT NULL DEFAULT 'UNKNOWN';

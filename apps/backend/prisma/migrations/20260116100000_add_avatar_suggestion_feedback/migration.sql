-- Add suggestion feedback storage.

CREATE TYPE "AvatarSuggestionDecision" AS ENUM ('ACCEPTED', 'REJECTED');

CREATE TYPE "AvatarSuggestionFeedbackSentiment" AS ENUM ('UP', 'DOWN', 'NEUTRAL');

CREATE TYPE "AvatarSuggestionFeedbackReasonCode" AS ENUM (
    'HELPFUL_STRUCTURING',
    'TOO_GENERIC',
    'INCORRECT_ASSUMPTION',
    'MISSING_CONTEXT',
    'NOT_RELEVANT',
    'ALREADY_KNOWN',
    'OTHER'
);

CREATE TABLE "AvatarSuggestionFeedback" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT,
    "decision" "AvatarSuggestionDecision" NOT NULL,
    "rating" INTEGER,
    "sentiment" "AvatarSuggestionFeedbackSentiment",
    "reasonCode" "AvatarSuggestionFeedbackReasonCode",
    "commentL1" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvatarSuggestionFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvatarSuggestionFeedback_orgId_intentId_createdAt_idx"
ON "AvatarSuggestionFeedback"("orgId", "intentId", "createdAt");

CREATE INDEX "AvatarSuggestionFeedback_suggestionId_createdAt_idx"
ON "AvatarSuggestionFeedback"("suggestionId", "createdAt");

ALTER TABLE "AvatarSuggestionFeedback" ADD CONSTRAINT "AvatarSuggestionFeedback_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvatarSuggestionFeedback" ADD CONSTRAINT "AvatarSuggestionFeedback_intentId_fkey"
FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvatarSuggestionFeedback" ADD CONSTRAINT "AvatarSuggestionFeedback_suggestionId_fkey"
FOREIGN KEY ("suggestionId") REFERENCES "AvatarSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvatarSuggestionFeedback" ADD CONSTRAINT "AvatarSuggestionFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

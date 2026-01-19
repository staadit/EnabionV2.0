-- CreateEnum
CREATE TYPE "MatchFeedbackAction" AS ENUM ('SHORTLIST', 'HIDE', 'NOT_RELEVANT');

-- AlterTable
ALTER TABLE "MatchFeedback" ADD COLUMN "action" "MatchFeedbackAction";

UPDATE "MatchFeedback"
SET "action" = CASE
  WHEN "rating" = 'UP' THEN 'SHORTLIST'
  ELSE 'NOT_RELEVANT'
END
WHERE "action" IS NULL;

ALTER TABLE "MatchFeedback" ALTER COLUMN "action" SET NOT NULL;

-- AI Gateway: rate limit window storage.

CREATE TABLE "AiRateLimitWindow" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRateLimitWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiRateLimitWindow_key_windowStart_key" ON "AiRateLimitWindow"("key", "windowStart");
CREATE INDEX "AiRateLimitWindow_windowStart_idx" ON "AiRateLimitWindow"("windowStart");
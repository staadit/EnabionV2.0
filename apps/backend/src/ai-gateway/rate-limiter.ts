import type { PrismaService } from '../prisma.service';

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  windowStart: Date;
};

export interface RateLimiter {
  consume(key: string, limit: number, now?: Date): Promise<RateLimitResult>;
  cleanup?: (cutoff: Date) => Promise<void>;
}

const ONE_MINUTE_MS = 60 * 1000;

function toWindowStart(date: Date): Date {
  const ms = date.getTime();
  return new Date(Math.floor(ms / ONE_MINUTE_MS) * ONE_MINUTE_MS);
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { windowStart: number; count: number }>();

  async consume(key: string, limit: number, now: Date = new Date()): Promise<RateLimitResult> {
    const windowStart = toWindowStart(now);
    const entry = this.windows.get(key);
    if (!entry || entry.windowStart !== windowStart.getTime()) {
      this.windows.set(key, { windowStart: windowStart.getTime(), count: 1 });
      return {
        allowed: limit <= 0 ? true : 1 <= limit,
        count: 1,
        limit,
        windowStart,
      };
    }
    entry.count += 1;
    return {
      allowed: limit <= 0 ? true : entry.count <= limit,
      count: entry.count,
      limit,
      windowStart,
    };
  }
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(private readonly prisma: PrismaService) {}

  async consume(key: string, limit: number, now: Date = new Date()): Promise<RateLimitResult> {
    const windowStart = toWindowStart(now);
    if (limit <= 0) {
      return {
        allowed: true,
        count: 0,
        limit,
        windowStart,
      };
    }

    const record = await this.prisma.aiRateLimitWindow.upsert({
      where: {
        key_windowStart: {
          key,
          windowStart,
        },
      },
      create: {
        key,
        windowStart,
        count: 1,
        updatedAt: now,
      },
      update: {
        count: { increment: 1 },
        updatedAt: now,
      },
    });

    return {
      allowed: record.count <= limit,
      count: record.count,
      limit,
      windowStart,
    };
  }

  async cleanup(cutoff: Date): Promise<void> {
    await this.prisma.aiRateLimitWindow.deleteMany({
      where: {
        windowStart: { lt: cutoff },
      },
    });
  }
}

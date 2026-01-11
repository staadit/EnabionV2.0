import { randomUUID, createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { ShareLinkService } from '../src/intents/share-link.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

type ShareLinkRecord = {
  id: string;
  orgId: string;
  intentId: string;
  createdByUserId: string;
  tokenHashSha256: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedByUserId: string | null;
  lastAccessAt: Date | null;
  accessCount: number;
};

class FakeRedactionService {
  async getShareViewByIntentId(intentId: string) {
    return {
      intent: {
        id: intentId,
        title: 'Intent title',
        goal: 'Goal',
        client: 'Client',
        stage: 'NEW',
        language: 'EN',
        lastActivityAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        sourceTextRaw: null,
        hasL2: false,
        l2Redacted: false,
        ndaRequired: false,
      },
      attachments: [],
    };
  }
}

class FakePrismaService {
  intents: Array<{ id: string; orgId: string }> = [];
  links: ShareLinkRecord[] = [];

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  intent = {
    findFirst: async (args: any) => {
      const found = this.intents.find(
        (intent) => intent.id === args?.where?.id && intent.orgId === args?.where?.orgId,
      );
      if (!found) return null;
      if (args?.select) {
        const out: any = {};
        for (const [key, value] of Object.entries(args.select)) {
          if (value === true) out[key] = (found as any)[key];
        }
        return out;
      }
      return found;
    },
  };

  intentShareLink = {
    updateMany: async (args: any) => {
      const now = args?.data?.revokedAt as Date;
      let count = 0;
      this.links = this.links.map((link) => {
        const matches =
          link.intentId === args?.where?.intentId &&
          link.orgId === args?.where?.orgId &&
          link.revokedAt === null &&
          link.expiresAt > (args?.where?.expiresAt?.gt as Date);
        if (!matches) return link;
        count += 1;
        return { ...link, revokedAt: now, revokedByUserId: args?.data?.revokedByUserId ?? null };
      });
      return { count };
    },
    create: async (args: any) => {
      const record: ShareLinkRecord = {
        id: randomUUID(),
        orgId: args.data.orgId,
        intentId: args.data.intentId,
        createdByUserId: args.data.createdByUserId,
        tokenHashSha256: args.data.tokenHashSha256,
        createdAt: args.data.createdAt ?? new Date(),
        expiresAt: args.data.expiresAt,
        revokedAt: null,
        revokedByUserId: null,
        lastAccessAt: null,
        accessCount: 0,
      };
      this.links.push(record);
      return record;
    },
    findMany: async (args: any) => {
      return this.links
        .filter((link) => link.orgId === args?.where?.orgId && link.intentId === args?.where?.intentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    findFirst: async (args: any) => {
      if (args?.where?.id) {
        return this.links.find(
          (link) => link.id === args.where.id && link.intentId === args.where.intentId && link.orgId === args.where.orgId,
        );
      }
      const now = new Date();
      return this.links.find(
        (link) =>
          link.tokenHashSha256 === args?.where?.tokenHashSha256 &&
          link.revokedAt === null &&
          link.expiresAt > now,
      );
    },
    update: async (args: any) => {
      let updated: ShareLinkRecord | undefined;
      this.links = this.links.map((link): ShareLinkRecord => {
        if (link.id !== args?.where?.id) return link;
        const next: ShareLinkRecord = {
          ...link,
          ...args.data,
          accessCount:
            typeof args.data?.accessCount?.increment === 'number'
              ? link.accessCount + args.data.accessCount.increment
              : args.data.accessCount ?? link.accessCount,
        };
        updated = next;
        return next;
      });
      return updated ?? null;
    },
  };
}

async function testCreateAndRevoke() {
  const prisma = new FakePrismaService();
  prisma.intents = [{ id: 'intent-1', orgId: 'org-1' }];
  const service = new ShareLinkService(prisma as any, new FakeRedactionService() as any);

  const created = await service.createShareLink({
    orgId: 'org-1',
    intentId: 'intent-1',
    actorUserId: 'user-1',
  });

  assert(created.token, 'Token should be returned on create');
  assert(created.shareUrl.includes(created.token), 'Share URL should include token');

  const stored = prisma.links[0];
  const expectedHash = createHash('sha256').update(created.token).digest('hex');
  assert(stored.tokenHashSha256 === expectedHash, 'Token hash should be stored, not raw token');

  const ttlDays = (stored.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  assert(ttlDays > 10 && ttlDays < 16, 'TTL should default to ~14 days');

  // Creating a second link revokes the first active one.
  await service.createShareLink({
    orgId: 'org-1',
    intentId: 'intent-1',
    actorUserId: 'user-1',
  });
  const revoked = prisma.links.find((link) => link.id === stored.id)!;
  assert(revoked.revokedAt !== null, 'Previous link should be revoked on new create');
}

async function testPublicViewAndExpiration() {
  const prisma = new FakePrismaService();
  prisma.intents = [{ id: 'intent-1', orgId: 'org-1' }];
  const service = new ShareLinkService(prisma as any, new FakeRedactionService() as any);

  const created = await service.createShareLink({
    orgId: 'org-1',
    intentId: 'intent-1',
    actorUserId: 'user-1',
  });

  const view = await service.resolvePublicView(created.token);
  assert(view.intent?.id === 'intent-1', 'Public view should resolve intent');

  const active = prisma.links.find((link) => link.tokenHashSha256 === createHash('sha256').update(created.token).digest('hex'))!;
  assert(active.accessCount === 1, 'Access count should increment on view');
  assert(active.lastAccessAt instanceof Date, 'lastAccessAt should be set');

  // Expire the link and ensure it is no longer accessible.
  active.expiresAt = new Date(Date.now() - 1000);
  let threw = false;
  try {
    await service.resolvePublicView(created.token);
  } catch (err) {
    threw = err instanceof NotFoundException;
  }
  assert(threw, 'Expired links should return not found');
}

async function run() {
  await testCreateAndRevoke();
  await testPublicViewAndExpiration();
  // eslint-disable-next-line no-console
  console.log('Share link tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

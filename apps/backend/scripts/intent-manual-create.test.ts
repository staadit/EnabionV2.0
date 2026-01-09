import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/auth/roles.guard';
import { EVENT_TYPES } from '../src/events/event-registry';
import { EventService } from '../src/events/event.service';
import { IntentController } from '../src/intents/intent.controller';
import { IntentService } from '../src/intents/intent.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesText(value: string | null | undefined, search: string) {
  if (!value) return false;
  return value.toLowerCase().includes(search.toLowerCase());
}

function asArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function matchesWhere(intent: any, where: any): boolean {
  if (!where) return true;
  const andFilters = asArray(where.AND);
  for (const clause of andFilters) {
    if (!matchesWhere(intent, clause)) return false;
  }
  if (where.OR) {
    const orFilters = asArray(where.OR);
    if (!orFilters.some((clause) => matchesWhere(intent, clause))) {
      return false;
    }
  }
  if (where.id) {
    if (typeof where.id === 'string') {
      if (intent.id !== where.id) return false;
    } else {
      if (where.id.lt && !(intent.id < where.id.lt)) return false;
      if (where.id.gt && !(intent.id > where.id.gt)) return false;
    }
  }
  if (where.orgId && intent.orgId !== where.orgId) return false;
  if (where.ownerUserId && intent.ownerUserId !== where.ownerUserId) return false;
  if (where.language && intent.language !== where.language) return false;
  if (where.stage) {
    if (where.stage.in && !where.stage.in.includes(intent.stage)) return false;
    if (typeof where.stage === 'string' && intent.stage !== where.stage) return false;
  }
  if (where.lastActivityAt) {
    const value = intent.lastActivityAt as Date;
    if (where.lastActivityAt instanceof Date) {
      if (value.getTime() !== where.lastActivityAt.getTime()) return false;
    } else {
      if (where.lastActivityAt.gte && value < where.lastActivityAt.gte) return false;
      if (where.lastActivityAt.lte && value > where.lastActivityAt.lte) return false;
      if (where.lastActivityAt.lt && value >= where.lastActivityAt.lt) return false;
      if (where.lastActivityAt.gt && value <= where.lastActivityAt.gt) return false;
    }
  }
  if (where.title?.contains) {
    if (!includesText(intent.title, where.title.contains)) return false;
  }
  if (where.client?.contains) {
    if (!includesText(intent.client, where.client.contains)) return false;
  }
  return true;
}

class MockPrismaService {
  intents: any[] = [];
  events: any[] = [];
  users: any[] = [];

  organization = {
    findUnique: async (args: any) => {
      if (!args?.where?.id) return null;
      return { id: args.where.id, defaultLanguage: 'EN' };
    },
  };

  intent = {
    create: async (args: any) => {
      const record = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: args.data.lastActivityAt ?? new Date(),
        language: args.data.language ?? 'EN',
        ...args.data,
      };
      this.intents.push(record);
      return record;
    },
    findMany: async (args: any) => {
      let results = this.intents.filter((intent) => matchesWhere(intent, args?.where));
      const orderBy = asArray(args?.orderBy);
      if (orderBy.length) {
        results = results.sort((a, b) => {
          for (const clause of orderBy) {
            const [field, direction] = Object.entries(clause || {})[0] ?? [];
            if (!field || !direction) continue;
            const left = a[field];
            const right = b[field];
            if (left === right) continue;
            const desc = direction === 'desc';
            return left < right ? (desc ? 1 : -1) : desc ? -1 : 1;
          }
          return 0;
        });
      }
      if (args?.take) {
        results = results.slice(0, args.take);
      }
      if (args?.select?.owner) {
        return results.map((intent) => {
          const owner = this.users.find((user) => user.id === intent.ownerUserId);
          return {
            ...intent,
            owner: owner ? { id: owner.id, email: owner.email } : null,
          };
        });
      }
      return results;
    },
    updateMany: async (args: any) => {
      let updated = 0;
      this.intents = this.intents.map((intent) => {
        if (!matchesWhere(intent, args?.where)) {
          return intent;
        }
        updated += 1;
        return {
          ...intent,
          ...args?.data,
        };
      });
      return { count: updated };
    },
  };

  event = {
    create: async (args: any) => {
      this.events.push(args.data);
      return args.data;
    },
  };
}

async function testCreate() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const service = new IntentService(prisma as any, events);

  prisma.users = [{ id: 'user-1', email: 'owner@example.com' }];

  const intent = await service.createIntent({
    orgId: 'org-1',
    actorUserId: 'user-1',
    goal: 'Launch R1.0',
    context: 'Pilot context',
    scope: 'Scope notes',
    kpi: 'Pipeline velocity',
    risks: 'Delivery risk',
    deadlineAt: new Date('2026-02-01T00:00:00.000Z'),
  });

  assert(intent.stage === 'NEW', 'Intent stage should default to NEW');
  assert(intent.orgId === 'org-1', 'Intent orgId should come from auth context');
  assert(intent.title === intent.goal, 'Manual intent title should match goal');
  assert(intent.ownerUserId === 'user-1', 'Intent owner should default to creator');
  assert(intent.language === 'EN', 'Intent language should default to org language');
  assert(intent.lastActivityAt instanceof Date, 'Intent lastActivityAt should be set');
  assert(prisma.events.length === 1, 'INTENT_CREATED event should be emitted');

  const event = prisma.events[0];
  assert(event.type === EVENT_TYPES.INTENT_CREATED, 'Event type should be INTENT_CREATED');
  assert(event.subjectId === intent.id, 'Event subjectId should match intent id');
  assert(event.pipelineStage === 'NEW', 'Event pipelineStage should be NEW');

  const payload = event.payload as any;
  assert(payload.intentId === intent.id, 'Event payload should include intentId');
  assert(payload.title === intent.goal, 'Event payload title should match goal');
  assert(payload.goal === intent.goal, 'Event payload should include goal');
  assert(payload.source === 'manual', 'Event payload source should be manual');
}

async function testPasteCreate() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const service = new IntentService(prisma as any, events);

  prisma.users = [{ id: 'user-2', email: 'owner2@example.com' }];

  const raw = 'Subject: RFP\\nWe need a vendor for pilot.';
  const sha = createHash('sha256').update(raw).digest('hex');

  const intent = await service.createIntent({
    orgId: 'org-2',
    actorUserId: 'user-2',
    sourceTextRaw: raw,
    title: 'RFP Pilot',
  });

  assert(intent.source === 'paste', 'Intent source should be paste');
  assert(intent.sourceTextRaw === raw, 'Intent should store raw source text');
  assert(intent.sourceTextSha256 === sha, 'Intent should store source text hash');
  assert(intent.sourceTextLength === raw.length, 'Intent should store source text length');
  assert(intent.ownerUserId === 'user-2', 'Paste intent owner should default to creator');
  assert(intent.language === 'EN', 'Paste intent language should default to org language');
  assert(prisma.events.length === 1, 'INTENT_CREATED event should be emitted');

  const payload = prisma.events[0].payload as any;
  assert(payload.title === 'RFP Pilot', 'Event payload should include title');
  assert(payload.source === 'paste', 'Event payload source should be paste');
  assert(payload.sourceText?.sha256 === sha, 'Event payload should include source text hash');
  assert(payload.sourceText?.length === raw.length, 'Event payload should include source text length');
  assert(!payload.sourceTextRaw, 'Event payload must not include raw text');
}

async function testValidation() {
  const prisma = new MockPrismaService();
  const events = new EventService(prisma as any);
  const service = new IntentService(prisma as any, events);
  const controller = new IntentController(service);

  const req = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      orgId: 'org-1',
      role: 'Owner',
    },
  } as any;

  let threw = false;
  try {
    await controller.createIntent(req, { goal: '  ' } as any);
  } catch (err) {
    if (err instanceof BadRequestException) {
      threw = true;
    }
  }
  assert(threw, 'Missing goal should throw BadRequestException');

  threw = false;
  const tooLong = 'a'.repeat(100001);
  try {
    await controller.createIntent(req, { sourceTextRaw: tooLong } as any);
  } catch (err) {
    if (err instanceof BadRequestException) {
      threw = true;
    }
  }
  assert(threw, 'Oversized sourceTextRaw should throw BadRequestException');
}

async function testListFilters() {
  const prisma = new MockPrismaService();
  prisma.users = [
    { id: 'user-1', email: 'owner1@example.com' },
    { id: 'user-2', email: 'owner2@example.com' },
  ];
  const events = new EventService(prisma as any);
  const service = new IntentService(prisma as any, events);

  const intentA = await service.createIntent({
    orgId: 'org-1',
    actorUserId: 'user-1',
    goal: 'Alpha launch',
    client: 'Acme',
    language: 'EN',
  });
  const intentB = await service.createIntent({
    orgId: 'org-1',
    actorUserId: 'user-2',
    goal: 'Beta release',
    client: 'Bravo',
    language: 'PL',
  });
  const intentC = await service.createIntent({
    orgId: 'org-1',
    actorUserId: 'user-1',
    goal: 'Gamma rollout',
    client: 'Contoso',
    language: 'EN',
  });

  const recordA = prisma.intents.find((row) => row.id === intentA.id)!;
  const recordB = prisma.intents.find((row) => row.id === intentB.id)!;
  const recordC = prisma.intents.find((row) => row.id === intentC.id)!;

  recordA.stage = 'NEW';
  recordB.stage = 'MATCH';
  recordC.stage = 'CLARIFY';

  recordA.lastActivityAt = new Date('2026-01-01T00:00:00.000Z');
  recordB.lastActivityAt = new Date('2026-01-05T00:00:00.000Z');
  recordC.lastActivityAt = new Date('2026-01-03T00:00:00.000Z');

  let result = await service.listIntents({
    orgId: 'org-1',
    statuses: ['MATCH'],
  });
  assert(result.items.length === 1, 'Status filter should return one intent');
  assert(result.items[0].id === intentB.id, 'Status filter should return MATCH intent');

  result = await service.listIntents({
    orgId: 'org-1',
    ownerId: 'user-1',
  });
  assert(result.items.length === 2, 'Owner filter should return two intents');

  result = await service.listIntents({
    orgId: 'org-1',
    language: 'PL',
  });
  assert(result.items.length === 1, 'Language filter should return one intent');
  assert(result.items[0].id === intentB.id, 'Language filter should return PL intent');

  result = await service.listIntents({
    orgId: 'org-1',
    from: new Date('2026-01-02T00:00:00.000Z'),
    to: new Date('2026-01-04T23:59:59.000Z'),
  });
  assert(result.items.length === 1, 'Date range filter should return one intent');
  assert(result.items[0].id === intentC.id, 'Date range should match intentC');

  result = await service.listIntents({
    orgId: 'org-1',
    q: 'acme',
  });
  assert(result.items.length === 1, 'Search filter should return one intent');
  assert(result.items[0].id === intentA.id, 'Search should match client name');

  result = await service.listIntents({ orgId: 'org-1' });
  assert(result.items[0].id === intentB.id, 'Default sort should be lastActivityAt desc');

  const page1 = await service.listIntents({ orgId: 'org-1', limit: 1 });
  assert(page1.items.length === 1, 'Pagination should return one item');
  assert(page1.nextCursor, 'Pagination should return nextCursor');

  const page2 = await service.listIntents({
    orgId: 'org-1',
    limit: 1,
    cursor: page1.nextCursor!,
  });
  assert(page2.items.length === 1, 'Second page should return one item');

  const touchDate = new Date('2026-01-06T00:00:00.000Z');
  await events.emitEvent({
    type: EVENT_TYPES.INTENT_UPDATED,
    occurredAt: touchDate,
    orgId: 'org-1',
    actorUserId: 'user-1',
    actorOrgId: 'org-1',
    subjectType: 'INTENT',
    subjectId: intentA.id,
    lifecycleStep: 'CLARIFY',
    pipelineStage: 'NEW',
    channel: 'ui',
    correlationId: 'test',
    payload: {
      payloadVersion: 1,
      intentId: intentA.id,
      changedFields: ['title'],
      changeSummary: 'Test update',
    },
  });
  const updatedA = prisma.intents.find((row) => row.id === intentA.id)!;
  assert(
    updatedA.lastActivityAt.getTime() === touchDate.getTime(),
    'Event emission should update lastActivityAt',
  );
}

async function testRolesGuard() {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const context = {
    getHandler: () => IntentController.prototype.createIntent,
    getClass: () => IntentController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-2',
          email: 'viewer@example.com',
          orgId: 'org-1',
          role: 'Viewer',
        },
      }),
    }),
  } as any;

  let threw = false;
  try {
    guard.canActivate(context);
  } catch (err) {
    if (err instanceof ForbiddenException) {
      threw = true;
    }
  }
  assert(threw, 'Viewer should be forbidden by RolesGuard');
}

async function run() {
  await testCreate();
  await testPasteCreate();
  await testValidation();
  await testListFilters();
  await testRolesGuard();
  // eslint-disable-next-line no-console
  console.log('Intent create tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

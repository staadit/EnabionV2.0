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

class MockPrismaService {
  intents: any[] = [];
  events: any[] = [];

  organization = {
    findUnique: async (args: any) => {
      if (!args?.where?.id) return null;
      return { id: args.where.id, defaultLanguage: 'EN' };
    },
  };

  intent = {
    create: async (args: any) => {
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.intents.push(record);
      return record;
    },
    findMany: async (args: any) => {
      const where = args?.where || {};
      const stage = where.stage;
      const orgId = where.orgId;
      let results = this.intents.filter((intent) => intent.orgId === orgId);
      if (stage) {
        results = results.filter((intent) => intent.stage === stage);
      }
      return results.slice(0, args?.take ?? results.length);
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
  await testValidation();
  await testRolesGuard();
  // eslint-disable-next-line no-console
  console.log('Intent manual create tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

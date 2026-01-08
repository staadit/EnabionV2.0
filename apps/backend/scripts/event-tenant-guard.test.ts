import { BadRequestException } from '@nestjs/common';
import { EventController } from '../src/events/event.controller';
import { EventService } from '../src/events/event.service';
import { EVENT_TYPES } from '../src/events/event-registry';

// Minimal mock Prisma client to capture queries
class MockPrismaService {
  public lastFindManyArgs: any;
  public lastCreateArgs: any;

  event = {
    findMany: async (args: any) => {
      this.lastFindManyArgs = args;
      return [];
    },
    create: async (args: any) => {
      this.lastCreateArgs = args;
      return args;
    },
  };
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const prisma = new MockPrismaService();
  const svc = new EventService(prisma as any);
  const controller = new EventController(svc);

  // Controller must enforce session context on list
  let threw = false;
  try {
    await controller.list({} as any);
  } catch (err) {
    if (err instanceof BadRequestException) {
      threw = true;
    }
  }
  assert(threw, 'list() without req.user should throw BadRequestException');

  const req = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      orgId: 'org-123',
      role: 'Owner',
    },
  } as any;

  // Controller must scope queries by req.user.orgId
  await controller.list(req);
  assert(
    prisma.lastFindManyArgs?.where?.orgId === 'org-123',
    'list() must scope by req.user.orgId',
  );

  // Controller must override orgId/actorUserId from req.user
  await controller.create(req, {
    orgId: 'org-evil',
    actorUserId: 'user-evil',
    actorOrgId: 'org-evil',
    subjectType: 'INTENT',
    subjectId: 'intent-1',
    lifecycleStep: 'CLARIFY',
    pipelineStage: 'NEW',
    channel: 'ui',
    correlationId: 'corr-1',
    occurredAt: new Date(),
    type: EVENT_TYPES.INTENT_CREATED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent-1',
      title: 'Test',
      language: 'EN',
      confidentialityLevel: 'L1',
      source: 'manual',
    },
  });
  assert(
    prisma.lastCreateArgs?.data?.orgId === 'org-123',
    'create() must override orgId from req.user',
  );
  assert(
    prisma.lastCreateArgs?.data?.actorUserId === 'user-1',
    'create() must override actorUserId from req.user',
  );
  assert(
    prisma.lastCreateArgs?.data?.actorOrgId === 'org-123',
    'create() must override actorOrgId from req.user',
  );

  // eslint-disable-next-line no-console
  console.log('Event tenant guard tests passed.');
}

run();

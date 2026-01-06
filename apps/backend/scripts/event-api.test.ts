import { BadRequestException } from '@nestjs/common';
import { EventController } from '../src/events/event.controller';
import { EventService } from '../src/events/event.service';
import { EVENT_TYPES } from '../src/events/event-registry';

class MockPrismaService {
  public created: any;
  public queried: any;

  event = {
    create: async (args: any) => {
      this.created = args;
      return args;
    },
    findMany: async (args: any) => {
      this.queried = args;
      return [];
    },
  };
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const prisma = new MockPrismaService();
  const svc = new EventService(prisma as any);
  const controller = new EventController(svc);
  const req = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      orgId: 'org-1',
      role: 'Owner',
    },
  } as any;

  // GET without req.user should throw 400
  let threw = false;
  try {
    await controller.list({} as any);
  } catch (err) {
    if (err instanceof BadRequestException) threw = true;
  }
  assert(threw, 'GET /events without req.user should be 400');

  // POST with invalid payload should throw (missing payloadVersion)
  threw = false;
  try {
    await controller.create(req, {
      subjectType: 'INTENT',
      subjectId: 'intent-1',
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'ui',
      correlationId: 'corr-1',
      occurredAt: new Date(),
      type: EVENT_TYPES.INTENT_CREATED,
      payload: { intentId: 'intent-1' },
    });
  } catch {
    threw = true;
  }
  assert(threw, 'POST /events with bad payload should fail');

  // Happy path POST then GET scoped by orgId
  await controller.create(req, {
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
      title: 'T',
      language: 'EN',
      confidentialityLevel: 'L1',
      source: 'manual',
    },
  });
  assert(prisma.created?.data?.orgId === 'org-1', 'orgId must persist on create');
  assert(
    prisma.created?.data?.actorUserId === 'user-1',
    'actorUserId must persist on create',
  );
  assert(prisma.created?.data?.lifecycleStep, 'lifecycleStep must persist');
  assert(prisma.created?.data?.pipelineStage, 'pipelineStage must persist');

  await controller.list(req);
  assert(prisma.queried?.where?.orgId === 'org-1', 'GET must scope by orgId');

  // eslint-disable-next-line no-console
  console.log('Event API tests passed.');
}

run();

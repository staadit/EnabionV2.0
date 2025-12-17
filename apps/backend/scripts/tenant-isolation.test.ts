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

  // Controller must enforce orgId on list
  let threw = false;
  try {
    await controller.list(undefined);
  } catch (err) {
    if (err instanceof BadRequestException) {
      threw = true;
    }
  }
  assert(threw, 'list() without orgId should throw BadRequestException');

  // Service must scope queries by orgId
  await svc.findMany({ orgId: 'org-123', limit: 10 });
  assert(
    prisma.lastFindManyArgs?.where?.orgId === 'org-123',
    'findMany() must scope by orgId',
  );

  // Emit should preserve orgId into create payload
  await svc.emitEvent({
    orgId: 'org-abc',
    actorUserId: 'user-1',
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
    prisma.lastCreateArgs?.data?.orgId === 'org-abc',
    'emitEvent must persist orgId',
  );

  // eslint-disable-next-line no-console
  console.log('Tenant isolation/RBAC tests passed.');
}

run();

import { NotFoundException } from '@nestjs/common';
import { IntentRedactionService } from '../src/intents/intent-redaction.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const baseIntent = {
  id: 'intent-1',
  intentNumber: 1,
  intentName: 'Intent 1',
  orgId: 'org-x',
  goal: 'Goal',
  title: 'Title',
  client: null,
  stage: 'NEW',
  language: 'EN',
  lastActivityAt: new Date(),
  sourceTextRaw: 'L2 text',
};

const attachments = [
  {
    id: 'att-1',
    filename: 'file.txt',
    createdAt: new Date(),
    blob: {
      confidentiality: 'L2',
      sizeBytes: 10,
    },
  },
];

function buildPrisma(recipientOrgId: string) {
  return {
    intent: {
      findUnique: async ({ where }: any) =>
        where.id === baseIntent.id ? { ...baseIntent } : null,
    },
    intentRecipient: {
      findFirst: async ({ where }: any) => {
        if (where.intentId === baseIntent.id && where.recipientOrgId === recipientOrgId) {
          return {
            senderOrgId: 'org-x',
            recipientRole: 'Y',
            ndaRequestedAt: null,
            senderOrg: { name: 'Org X' },
          };
        }
        return null;
      },
    },
    attachment: {
      findMany: async () => attachments,
      count: async () => attachments.length,
    },
  };
}

async function run() {
  const ndaServiceBlocked = {
    hasMutualAcceptance: async () => false,
  };

  const prismaMissing = buildPrisma('org-y');
  const serviceMissing = new IntentRedactionService(
    prismaMissing as any,
    ndaServiceBlocked as any,
  );

  let threw = false;
  try {
    await serviceMissing.getIncomingPayload(baseIntent.id, 'org-z');
  } catch (err) {
    threw = err instanceof NotFoundException;
  }
  assert(threw, 'Should reject when intent is not shared with viewer org');

  const prisma = buildPrisma('org-y');
  const service = new IntentRedactionService(prisma as any, ndaServiceBlocked as any);
  const blocked = await service.getIncomingPayload(baseIntent.id, 'org-y');
  assert(blocked.intent.sourceTextRaw === null, 'L2 source should be redacted without NDA');
  assert(blocked.intent.ndaGate.canViewL2 === false, 'ndaGate should block L2');
  assert(
    blocked.attachments[0].originalName === 'Locked attachment',
    'L2 attachments should be redacted',
  );
  assert(
    blocked.attachments[0].canDownload === false,
    'L2 attachments should not be downloadable without NDA',
  );

  const ndaServiceAllowed = {
    hasMutualAcceptance: async () => true,
  };
  const serviceAllowed = new IntentRedactionService(prisma as any, ndaServiceAllowed as any);
  const allowed = await serviceAllowed.getIncomingPayload(baseIntent.id, 'org-y');
  assert(allowed.intent.sourceTextRaw === 'L2 text', 'L2 source should be visible with NDA');
  assert(allowed.intent.ndaGate.canViewL2 === true, 'ndaGate should allow L2');
  assert(
    allowed.attachments[0].canDownload === true,
    'L2 attachments should be downloadable with NDA',
  );

  // eslint-disable-next-line no-console
  console.log('Incoming intents redaction tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

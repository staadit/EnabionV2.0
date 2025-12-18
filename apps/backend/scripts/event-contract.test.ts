import { ulid } from 'ulid';
import { EVENT_TYPES, validateEvent } from '../src/events/event-registry';

const baseEnvelope = {
  orgId: 'org_test',
  actorUserId: 'user_test',
  subjectType: 'INTENT' as const,
  subjectId: 'intent_test',
  lifecycleStep: 'CLARIFY' as const,
  pipelineStage: 'NEW' as const,
  channel: 'ui' as const,
  correlationId: 'corr_test',
  occurredAt: new Date(),
};

const cases = [
  {
    type: EVENT_TYPES.INTENT_CREATED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      title: 'Title',
      language: 'EN',
      confidentialityLevel: 'L1',
      source: 'manual',
    },
  },
  {
    type: EVENT_TYPES.NDA_ACCEPTED,
    payload: {
      payloadVersion: 1,
      ndaId: 'nda1',
      ndaLayer: 1,
      acceptedByUserId: 'user_test',
      acceptedAt: new Date().toISOString(),
    },
  },
  {
    type: EVENT_TYPES.EMAIL_RECEIVED,
    payload: {
      payloadVersion: 1,
      messageId: 'msg1',
      threadId: 'thread1',
      from: 'sender@example.com',
      subject: 'Subject',
      language: 'EN',
    },
  },
  {
    type: EVENT_TYPES.INTENT_VIEWED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      viewContext: 'owner',
    },
  },
  {
    type: EVENT_TYPES.INTENT_SHARED_LINK_VIEWED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      shareTokenId: 'token1',
    },
  },
  {
    type: EVENT_TYPES.EXPORT_GENERATED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      exportId: 'exp1',
      format: 'markdown',
    },
  },
  {
    type: EVENT_TYPES.ATTACHMENT_UPLOADED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      attachmentId: 'att1',
      filename: 'file.txt',
      sizeBytes: 123,
    },
  },
  {
    type: EVENT_TYPES.ATTACHMENT_DOWNLOADED,
    payload: {
      payloadVersion: 1,
      intentId: 'intent_test',
      attachmentId: 'att1',
      via: 'owner',
    },
  },
];

function expectValid(type: string, payload: Record<string, unknown>) {
  validateEvent({
    ...baseEnvelope,
    type: type as any,
    eventId: ulid(),
    payload,
  });
}

function expectInvalid() {
  let threw = false;
  try {
    validateEvent({
      ...baseEnvelope,
      type: EVENT_TYPES.INTENT_CREATED,
      eventId: ulid(),
      payload: { intentId: 'missing_version' },
    });
  } catch {
    threw = true;
  }

  if (!threw) {
    throw new Error('Contract test failed: missing payloadVersion did not throw');
  }

  // Missing lifecycleStep / pipelineStage should fail
  threw = false;
  try {
    validateEvent({
      ...baseEnvelope,
      lifecycleStep: undefined as any,
      type: EVENT_TYPES.INTENT_CREATED,
      eventId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: 'intent_test',
        title: 'Title',
        language: 'EN',
        confidentialityLevel: 'L1',
        source: 'manual',
      },
    });
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error('Contract test failed: missing lifecycleStep did not throw');
  }

  // Cross-org event without actorOrgId should fail
  threw = false;
  try {
    validateEvent({
      ...baseEnvelope,
      type: EVENT_TYPES.PARTNER_INVITED,
      eventId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: 'intent_test',
        partnerOrgId: 'orgY',
        inviteId: 'invite1',
        accessLevel: 'L1',
      },
    });
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error('Contract test failed: PARTNER_INVITED without actorOrgId did not throw');
  }
}

cases.forEach((c) => expectValid(c.type, c.payload));
expectInvalid();
// eslint-disable-next-line no-console
console.log('Event contract schemas validated.');

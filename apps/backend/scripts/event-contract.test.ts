import { ulid } from 'ulid';
import { EVENT_TYPES, EventEnvelopeInput, validateEvent } from '../src/events/event-registry';

type EnvelopeOverrides = Partial<Omit<EventEnvelopeInput, 'eventId' | 'type' | 'payload'>>;

const baseEnvelope: Omit<EventEnvelopeInput, 'eventId' | 'type' | 'payload'> = {
  orgId: 'org_test',
  actorUserId: 'user_test',
  subjectType: 'INTENT',
  subjectId: 'intent_test',
  lifecycleStep: 'CLARIFY',
  pipelineStage: 'NEW',
  channel: 'ui',
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
      ndaType: 'MUTUAL',
      ndaVersion: 'Enabion_mutual_nda_v0.1_en',
      enHashSha256: 'a'.repeat(64),
      language: 'EN',
      channel: 'ui',
      typedName: 'Jane Doe',
      typedRole: 'Owner',
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

function expectValid(
  type: string,
  payload: Record<string, unknown>,
  overrides: EnvelopeOverrides = {},
) {
  validateEvent({
    ...baseEnvelope,
    ...overrides,
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
expectValid(EVENT_TYPES.INTENT_AI_ACCESS_UPDATED, {
  payloadVersion: 1,
  intentId: 'intent_test',
  allowL2: true,
  previousAllowL2: false,
});
expectValid(
  EVENT_TYPES.USER_SIGNED_UP,
  {
    payloadVersion: 1,
    userId: 'user_test',
    email: 'user@example.com',
    orgId: 'org_test',
    role: 'Owner',
    sessionId: 'session_test',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectValid(
  EVENT_TYPES.USER_LOGGED_IN,
  {
    payloadVersion: 1,
    userId: 'user_test',
    orgId: 'org_test',
    sessionId: 'session_test',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectValid(
  EVENT_TYPES.USER_PASSWORD_RESET_REQUESTED,
  {
    payloadVersion: 1,
    userId: 'user_test',
    orgId: 'org_test',
    resetTokenId: 'reset_token_1',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectValid(
  EVENT_TYPES.USER_PASSWORD_RESET_COMPLETED,
  {
    payloadVersion: 1,
    userId: 'user_test',
    orgId: 'org_test',
    resetTokenId: 'reset_token_1',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectValid(
  EVENT_TYPES.EMAIL_SENT,
  {
    payloadVersion: 1,
    messageType: 'password_reset',
    transport: 'smtp',
    resetTokenId: 'reset_token_1',
    messageId: 'msg1',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectValid(
  EVENT_TYPES.AI_L2_USED,
  {
    payloadVersion: 1,
    requestId: 'req_test',
    tenantId: 'org_test',
    userId: 'user_test',
    intentId: 'intent_test',
    useCase: 'summary_internal',
    model: 'gpt-4o-mini',
    effectiveDataLevel: 'L2',
    requestedDataLevel: 'L2',
    redactionApplied: true,
    redactionVersion: 'v1',
    findingsSummary: {
      email: 1,
      phone: 0,
      iban: 0,
      pesel: 0,
      nip: 0,
      ssn: 0,
    },
  },
  { subjectType: 'AI_GATEWAY', subjectId: 'req_test', correlationId: 'req_test' },
);
expectValid(
  EVENT_TYPES.EMAIL_FAILED,
  {
    payloadVersion: 1,
    messageType: 'password_reset',
    transport: 'smtp',
    resetTokenId: 'reset_token_1',
    errorCode: 'smtp_not_configured',
  },
  { subjectType: 'USER', subjectId: 'user_test' },
);
expectInvalid();
// eslint-disable-next-line no-console
console.log('Event contract schemas validated.');

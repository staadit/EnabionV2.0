import { z } from 'zod';

export const SUBJECT_TYPES = {
  INTENT: 'INTENT',
  NDA: 'NDA',
  ORG: 'ORG',
  USER: 'USER',
  CONTACT: 'CONTACT',
  ENGAGEMENT: 'ENGAGEMENT',
  TRUSTSCORE_SNAPSHOT: 'TRUSTSCORE_SNAPSHOT',
  ATTACHMENT: 'ATTACHMENT',
  SHARE_LINK: 'SHARE_LINK',
  EXPORT: 'EXPORT',
  AI_GATEWAY: 'AI_GATEWAY',
} as const;

export const LIFECYCLE_STEPS = {
  CLARIFY: 'CLARIFY',
  MATCH_ALIGN: 'MATCH_ALIGN',
  COMMIT_ASSURE: 'COMMIT_ASSURE',
} as const;

export const PIPELINE_STAGES = {
  NEW: 'NEW',
  CLARIFY: 'CLARIFY',
  MATCH: 'MATCH',
  COMMIT: 'COMMIT',
  WON: 'WON',
  LOST: 'LOST',
} as const;

export const CHANNELS = {
  UI: 'ui',
  API: 'api',
  EMAIL_FORWARD: 'email_forward',
  EMAIL_REPLY: 'email_reply',
  SYSTEM: 'system',
} as const;

export const EVENT_TYPES = {
  INTENT_CREATED: 'INTENT_CREATED',
  INTENT_UPDATED: 'INTENT_UPDATED',
  INTENT_AI_ACCESS_UPDATED: 'INTENT_AI_ACCESS_UPDATED',
  INTENT_PIPELINE_STAGE_CHANGED: 'INTENT_PIPELINE_STAGE_CHANGED',
  NDA_PRESENTED: 'NDA_PRESENTED',
  NDA_ACCEPTED: 'NDA_ACCEPTED',
  CONFIDENTIALITY_LEVEL_CHANGED: 'CONFIDENTIALITY_LEVEL_CHANGED',
  AVATAR_SUGGESTION_ISSUED: 'AVATAR_SUGGESTION_ISSUED',
  AVATAR_SUGGESTION_ACCEPTED: 'AVATAR_SUGGESTION_ACCEPTED',
  AVATAR_SUGGESTION_REJECTED: 'AVATAR_SUGGESTION_REJECTED',
  AVATAR_SUGGESTION_FEEDBACK: 'AVATAR_SUGGESTION_FEEDBACK',
  AVATAR_FEEDBACK_RECORDED: 'AVATAR_FEEDBACK_RECORDED',
  MATCH_LIST_CREATED: 'MATCH_LIST_CREATED',
  PARTNER_INVITED: 'PARTNER_INVITED',
  PARTNER_RESPONSE_RECEIVED: 'PARTNER_RESPONSE_RECEIVED',
  COMMIT_DECISION_TAKEN: 'COMMIT_DECISION_TAKEN',
  EMAIL_RECEIVED: 'EMAIL_RECEIVED',
  EMAIL_THREAD_MAPPED_TO_INTENT: 'EMAIL_THREAD_MAPPED_TO_INTENT',
  EMAIL_APPLIED_AS_INTENT_UPDATE: 'EMAIL_APPLIED_AS_INTENT_UPDATE',
  EMAIL_SENT: 'EMAIL_SENT',
  EMAIL_FAILED: 'EMAIL_FAILED',
  AI_GATEWAY_REQUESTED: 'AI_GATEWAY_REQUESTED',
  AI_GATEWAY_SUCCEEDED: 'AI_GATEWAY_SUCCEEDED',
  AI_GATEWAY_FAILED: 'AI_GATEWAY_FAILED',
  AI_GATEWAY_BLOCKED_POLICY: 'AI_GATEWAY_BLOCKED_POLICY',
  AI_GATEWAY_RATE_LIMITED: 'AI_GATEWAY_RATE_LIMITED',
  AI_L2_USED: 'AI_L2_USED',
  TRUSTSCORE_SNAPSHOT_CREATED: 'TRUSTSCORE_SNAPSHOT_CREATED',
  // Audit-critical coverage
  INTENT_VIEWED: 'INTENT_VIEWED',
  INTENT_SHARED_LINK_VIEWED: 'INTENT_SHARED_LINK_VIEWED',
  EXPORT_GENERATED: 'EXPORT_GENERATED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',
  ATTACHMENT_DOWNLOADED: 'ATTACHMENT_DOWNLOADED',
  ATTACHMENT_DELETED: 'ATTACHMENT_DELETED',
  ATTACHMENT_CONFIDENTIALITY_CHANGED: 'ATTACHMENT_CONFIDENTIALITY_CHANGED',
  USER_SIGNED_UP: 'USER_SIGNED_UP',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  USER_PASSWORD_RESET_REQUESTED: 'USER_PASSWORD_RESET_REQUESTED',
  USER_PASSWORD_RESET_COMPLETED: 'USER_PASSWORD_RESET_COMPLETED',
  ORG_PROFILE_UPDATED: 'ORG_PROFILE_UPDATED',
  ORG_MEMBER_ROLE_CHANGED: 'ORG_MEMBER_ROLE_CHANGED',
  ORG_MEMBER_DEACTIVATED: 'ORG_MEMBER_DEACTIVATED',
  ORG_PREFERENCES_UPDATED: 'ORG_PREFERENCES_UPDATED',
  PLATFORM_ADMIN_AUDIT: 'PLATFORM_ADMIN_AUDIT',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
export type SubjectType = (typeof SUBJECT_TYPES)[keyof typeof SUBJECT_TYPES];
export type LifecycleStep = (typeof LIFECYCLE_STEPS)[keyof typeof LIFECYCLE_STEPS];
export type PipelineStage = (typeof PIPELINE_STAGES)[keyof typeof PIPELINE_STAGES];
export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

const languageEnum = z.enum(['PL', 'DE', 'NL', 'EN', 'unknown']);
const aiDataLevelEnum = z.enum(['L1', 'L2']);
const aiGatewayUseCaseEnum = z.enum([
  'intent_structuring',
  'intent_gap_detection',
  'clarifying_questions',
  'fit_scoring',
  'summary_internal',
  'help_explanation',
]);
const suggestionKindEnum = z.enum([
  'missing_info',
  'risk',
  'question',
  'rewrite',
  'summary',
  'lead_qualification',
  'next_step',
]);
const suggestionDecisionEnum = z.enum(['ACCEPTED', 'REJECTED']);
const feedbackSentimentEnum = z.enum(['UP', 'DOWN', 'NEUTRAL']);
const feedbackReasonCodeEnum = z.enum([
  'HELPFUL_STRUCTURING',
  'TOO_GENERIC',
  'INCORRECT_ASSUMPTION',
  'MISSING_CONTEXT',
  'NOT_RELEVANT',
  'ALREADY_KNOWN',
  'OTHER',
]);
const inputClassEnum = z.enum(['L1', 'L2']);
const lifecycleEnum = z.enum(Object.values(LIFECYCLE_STEPS) as [LifecycleStep, ...LifecycleStep[]]);
const pipelineEnum = z.enum(Object.values(PIPELINE_STAGES) as [PipelineStage, ...PipelineStage[]]);
const channelEnum = z.enum(Object.values(CHANNELS) as [Channel, ...Channel[]]);
const subjectEnum = z.enum(Object.values(SUBJECT_TYPES) as [SubjectType, ...SubjectType[]]);
const eventTypeEnum = z.enum(Object.values(EVENT_TYPES) as [EventType, ...EventType[]]);
const redactionSummarySchema = z.object({
  email: z.number().int().nonnegative(),
  phone: z.number().int().nonnegative(),
  iban: z.number().int().nonnegative(),
  pesel: z.number().int().nonnegative(),
  nip: z.number().int().nonnegative(),
  ssn: z.number().int().nonnegative(),
});

const basePayload = z.object({
  payloadVersion: z.number().int().positive(),
});

const payloadSchemas: Record<EventType, z.ZodTypeAny> = {
  [EVENT_TYPES.INTENT_CREATED]: basePayload.extend({
    intentId: z.string().min(1),
    title: z.string().min(1),
    language: languageEnum,
    confidentialityLevel: z.enum(['L1', 'L2']),
    source: z.enum(['manual', 'paste', 'email']),
    goal: z.string().min(1).optional(),
    context: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    kpi: z.string().min(1).optional(),
    risks: z.string().min(1).optional(),
    deadlineAt: z.string().min(1).optional(),
    sourceText: z
      .object({
        sha256: z.string().length(64),
        length: z.number().int().nonnegative(),
      })
      .optional(),
  }),
  [EVENT_TYPES.INTENT_UPDATED]: basePayload.extend({
    intentId: z.string().min(1),
    changedFields: z.array(z.string().min(1)),
    changeSummary: z.string().min(1),
  }),
  [EVENT_TYPES.INTENT_AI_ACCESS_UPDATED]: basePayload.extend({
    intentId: z.string().min(1),
    allowL2: z.boolean(),
    previousAllowL2: z.boolean().optional(),
  }),
  [EVENT_TYPES.INTENT_PIPELINE_STAGE_CHANGED]: basePayload.extend({
    intentId: z.string().min(1),
    fromStage: pipelineEnum,
    toStage: pipelineEnum,
  }),
  [EVENT_TYPES.NDA_PRESENTED]: basePayload.extend({
    ndaId: z.string().min(1),
    ndaLayer: z.literal(1),
    counterpartyOrgId: z.string().min(1).optional(),
  }),
  [EVENT_TYPES.NDA_ACCEPTED]: basePayload.extend({
    ndaType: z.enum(['MUTUAL']),
    ndaVersion: z.string().min(1),
    enHashSha256: z.string().length(64),
    language: languageEnum,
    channel: channelEnum,
    typedName: z.string().min(1),
    typedRole: z.string().min(1),
    acceptedByUserId: z.string().min(1),
    acceptedAt: z.coerce.date(),
    counterpartyOrgId: z.string().min(1).optional(),
    ndaId: z.string().min(1).optional(),
    ndaLayer: z.literal(1).optional(),
  }),
  [EVENT_TYPES.CONFIDENTIALITY_LEVEL_CHANGED]: basePayload.extend({
    intentId: z.string().min(1),
    fromLevel: z.enum(['L1', 'L2']),
    toLevel: z.enum(['L1', 'L2']),
  }),
  [EVENT_TYPES.AVATAR_SUGGESTION_ISSUED]: basePayload.extend({
    intentId: z.string().min(1).optional(),
    avatarType: z.enum(['SYSTEM', 'ORG_X', 'INTENT_COACH']),
    suggestionId: z.string().min(1),
    suggestionKind: suggestionKindEnum,
    suggestionL1Text: z.string().min(1).optional(),
    suggestionRef: z.string().min(1).optional(),
    fitBand: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NO_FIT']).optional(),
    priority: z.enum(['P1', 'P2', 'P3']).optional(),
  }),
  [EVENT_TYPES.AVATAR_SUGGESTION_ACCEPTED]: basePayload.extend({
    suggestionId: z.string().min(1),
    intentId: z.string().min(1).optional(),
    appliedFields: z.array(z.string().min(1)).optional(),
  }),
  [EVENT_TYPES.AVATAR_SUGGESTION_REJECTED]: basePayload.extend({
    suggestionId: z.string().min(1),
    intentId: z.string().min(1).optional(),
    reasonCode: feedbackReasonCodeEnum.optional(),
  }),
  [EVENT_TYPES.AVATAR_SUGGESTION_FEEDBACK]: basePayload.extend({
    orgId: z.string().min(1),
    intentId: z.string().min(1),
    suggestionId: z.string().min(1),
    avatarType: z.enum(['SYSTEM', 'ORG_X', 'INTENT_COACH']),
    suggestionKind: suggestionKindEnum,
    decision: suggestionDecisionEnum,
    rating: z.number().int().min(1).max(5).optional(),
    sentiment: feedbackSentimentEnum.optional(),
    reasonCode: feedbackReasonCodeEnum.optional(),
    commentL1: z.string().min(1).max(280).optional(),
  }),
  [EVENT_TYPES.AVATAR_FEEDBACK_RECORDED]: basePayload.extend({
    avatarType: z.enum(['SYSTEM', 'ORG_X', 'INTENT_COACH']),
    intentId: z.string().min(1),
    rating: z.enum(['up', 'down']),
    freeText: z.string().optional(),
  }),
  [EVENT_TYPES.MATCH_LIST_CREATED]: basePayload.extend({
    intentId: z.string().min(1),
    matchListId: z.string().min(1),
    algorithmVersion: z.string().min(1),
    topCandidates: z.array(z.string().min(1)),
  }),
  [EVENT_TYPES.PARTNER_INVITED]: basePayload.extend({
    intentId: z.string().min(1),
    partnerOrgId: z.string().min(1),
    inviteId: z.string().min(1),
    accessLevel: z.enum(['L1']),
  }),
  [EVENT_TYPES.PARTNER_RESPONSE_RECEIVED]: basePayload.extend({
    intentId: z.string().min(1),
    partnerOrgId: z.string().min(1),
    responseId: z.string().min(1),
    goNoGo: z.enum(['go', 'no_go']),
    ownerUserId: z.string().min(1).optional(),
    attachmentCount: z.number().int().nonnegative(),
  }),
  [EVENT_TYPES.COMMIT_DECISION_TAKEN]: basePayload.extend({
    intentId: z.string().min(1),
    decision: z.enum(['commit', 'no_commit']),
    selectedPartnerOrgId: z.string().min(1).optional(),
  }),
  [EVENT_TYPES.EMAIL_RECEIVED]: basePayload.extend({
    messageId: z.string().min(1),
    threadId: z.string().min(1),
    from: z.string().min(1),
    subject: z.string().min(1),
    language: languageEnum,
  }),
  [EVENT_TYPES.EMAIL_THREAD_MAPPED_TO_INTENT]: basePayload.extend({
    threadId: z.string().min(1),
    intentId: z.string().min(1),
  }),
  [EVENT_TYPES.EMAIL_APPLIED_AS_INTENT_UPDATE]: basePayload.extend({
    intentId: z.string().min(1),
    messageId: z.string().min(1),
    updatedFields: z.array(z.string().min(1)),
  }),
  [EVENT_TYPES.EMAIL_SENT]: basePayload.extend({
    messageType: z.enum(['password_reset']),
    transport: z.enum(['smtp']),
    resetTokenId: z.string().min(1),
    messageId: z.string().min(1).optional(),
  }),
  [EVENT_TYPES.EMAIL_FAILED]: basePayload.extend({
    messageType: z.enum(['password_reset']),
    transport: z.enum(['smtp']),
    resetTokenId: z.string().min(1),
    errorCode: z.string().min(1),
  }),
  [EVENT_TYPES.AI_GATEWAY_REQUESTED]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    inputClass: inputClassEnum,
    containsL2: z.boolean().optional(),
    messageCount: z.number().int().nonnegative().optional(),
    totalChars: z.number().int().nonnegative().optional(),
    contentHash: z.string().length(64).optional(),
  }),
  [EVENT_TYPES.AI_GATEWAY_SUCCEEDED]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    inputTokens: z.number().int().nonnegative().nullable().optional(),
    outputTokens: z.number().int().nonnegative().nullable().optional(),
    totalTokens: z.number().int().nonnegative().nullable().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
  }),
  [EVENT_TYPES.AI_GATEWAY_FAILED]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    errorClass: z.string().min(1),
    latencyMs: z.number().int().nonnegative().optional(),
  }),
  [EVENT_TYPES.AI_GATEWAY_BLOCKED_POLICY]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    errorClass: z.string().min(1),
  }),
  [EVENT_TYPES.AI_GATEWAY_RATE_LIMITED]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    errorClass: z.string().min(1),
  }),
  [EVENT_TYPES.AI_L2_USED]: basePayload.extend({
    requestId: z.string().min(1),
    tenantId: z.string().min(1),
    userId: z.string().min(1).nullable().optional(),
    intentId: z.string().min(1),
    useCase: aiGatewayUseCaseEnum,
    model: z.string().min(1),
    effectiveDataLevel: z.literal('L2'),
    requestedDataLevel: aiDataLevelEnum.optional(),
    redactionApplied: z.boolean(),
    redactionVersion: z.string().min(1),
    findingsSummary: redactionSummarySchema,
  }),
  [EVENT_TYPES.TRUSTSCORE_SNAPSHOT_CREATED]: basePayload.extend({
    orgId: z.string().min(1),
    score: z.number(),
    factors: z.array(z.string().min(1)),
    computedAt: z.coerce.date(),
    algorithmVersion: z.string().min(1),
  }),
  [EVENT_TYPES.INTENT_VIEWED]: basePayload.extend({
    intentId: z.string().min(1),
    viewContext: z.enum(['owner', 'share_link', 'auditor', 'y_portal']).optional(),
  }),
  [EVENT_TYPES.INTENT_SHARED_LINK_VIEWED]: basePayload.extend({
    intentId: z.string().min(1),
    shareTokenId: z.string().min(1),
  }),
  [EVENT_TYPES.EXPORT_GENERATED]: basePayload.extend({
    intentId: z.string().min(1),
    exportId: z.string().min(1),
    format: z.enum(['markdown', 'pdf', 'docx']),
  }),
  [EVENT_TYPES.ATTACHMENT_UPLOADED]: basePayload.extend({
    intentId: z.string().min(1),
    attachmentId: z.string().min(1),
    filename: z.string().min(1),
    sizeBytes: z.number().int().nonnegative().optional(),
  }),
  [EVENT_TYPES.ATTACHMENT_DOWNLOADED]: basePayload.extend({
    intentId: z.string().min(1),
    attachmentId: z.string().min(1),
    via: z.enum(['owner', 'share_link', 'system']),
  }),
  [EVENT_TYPES.ATTACHMENT_DELETED]: basePayload.extend({
    intentId: z.string().min(1),
    attachmentId: z.string().min(1),
    filename: z.string().min(1).optional(),
  }),
  [EVENT_TYPES.ATTACHMENT_CONFIDENTIALITY_CHANGED]: basePayload.extend({
    intentId: z.string().min(1),
    attachmentId: z.string().min(1),
    fromLevel: z.enum(['L1', 'L2']),
    toLevel: z.enum(['L1', 'L2']),
  }),
  [EVENT_TYPES.USER_SIGNED_UP]: basePayload.extend({
    userId: z.string().min(1),
    email: z.string().min(1),
    orgId: z.string().min(1),
    role: z.string().min(1),
    sessionId: z.string().min(1),
  }),
  [EVENT_TYPES.USER_LOGGED_IN]: basePayload.extend({
    userId: z.string().min(1),
    orgId: z.string().min(1),
    sessionId: z.string().min(1),
  }),
  [EVENT_TYPES.USER_LOGGED_OUT]: basePayload.extend({
    userId: z.string().min(1),
    orgId: z.string().min(1),
    sessionId: z.string().min(1),
  }),
  [EVENT_TYPES.USER_PASSWORD_RESET_REQUESTED]: basePayload.extend({
    userId: z.string().min(1),
    orgId: z.string().min(1),
    resetTokenId: z.string().min(1),
  }),
  [EVENT_TYPES.USER_PASSWORD_RESET_COMPLETED]: basePayload.extend({
    userId: z.string().min(1),
    orgId: z.string().min(1),
    resetTokenId: z.string().min(1),
  }),
  [EVENT_TYPES.ORG_PROFILE_UPDATED]: basePayload.extend({
    orgId: z.string().min(1),
    changedFields: z.array(z.string().min(1)),
  }),
  [EVENT_TYPES.ORG_MEMBER_ROLE_CHANGED]: basePayload.extend({
    targetUserId: z.string().min(1),
    fromRole: z.string().min(1),
    toRole: z.string().min(1),
  }),
  [EVENT_TYPES.ORG_MEMBER_DEACTIVATED]: basePayload.extend({
    targetUserId: z.string().min(1),
  }),
  [EVENT_TYPES.ORG_PREFERENCES_UPDATED]: basePayload.extend({
    orgId: z.string().min(1),
    changedFields: z.array(z.string().min(1)),
  }),
  [EVENT_TYPES.PLATFORM_ADMIN_AUDIT]: basePayload.extend({
    action: z.string().min(1),
    targetType: z.enum(['TENANT', 'USER', 'EVENTS', 'EMAIL_INGEST', 'NDA']),
    targetOrgId: z.string().optional(),
    targetUserId: z.string().optional(),
    targetId: z.string().optional(),
    query: z.record(z.any()).optional(),
    resultCount: z.number().int().nonnegative().optional(),
  }),
};

const envelopeSchema = z
  .object({
    eventId: z.string().min(1),
    schemaVersion: z.literal(1),
    type: eventTypeEnum,
    occurredAt: z.coerce.date(),
    recordedAt: z.coerce.date().optional(),
    orgId: z.string().min(1),
    actorUserId: z.string().min(1).nullable().optional(),
    actorOrgId: z.string().min(1).nullable().optional(),
    subjectType: subjectEnum,
    subjectId: z.string().min(1),
    lifecycleStep: lifecycleEnum,
    pipelineStage: pipelineEnum,
    channel: channelEnum,
    correlationId: z.string().min(1),
    payload: z.any(),
  })
  .strict();

export type EventEnvelope = z.infer<typeof envelopeSchema>;

export type EventEnvelopeInput = Omit<EventEnvelope, 'recordedAt' | 'schemaVersion'> & {
  schemaVersion?: 1;
  recordedAt?: Date | string;
};

export type ValidatedEvent = EventEnvelope & {
  payload: Record<string, unknown>;
};

export function validateEvent(input: EventEnvelopeInput): ValidatedEvent {
  const parsedEnvelope = envelopeSchema.parse({
    ...input,
    schemaVersion: input.schemaVersion ?? 1,
    recordedAt: input.recordedAt ?? new Date(),
  });

  const payloadSchema = payloadSchemas[parsedEnvelope.type];
  if (!payloadSchema) {
    throw new Error(`No payload schema registered for event type ${parsedEnvelope.type}`);
  }

  const parsedPayload = payloadSchema.parse(parsedEnvelope.payload);

  // Cross-org events must carry actorOrgId (invites/responses between orgs)
  const crossOrgTypes: EventType[] = [
    EVENT_TYPES.PARTNER_INVITED,
    EVENT_TYPES.PARTNER_RESPONSE_RECEIVED,
  ];
  if (crossOrgTypes.includes(parsedEnvelope.type) && !parsedEnvelope.actorOrgId) {
    throw new Error(`actorOrgId is required for event type ${parsedEnvelope.type}`);
  }

  return {
    ...parsedEnvelope,
    payload: parsedPayload,
  };
}

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES);

import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { AiAccessService } from '../ai-gateway/ai-access.service';
import type { AiGatewayMessage } from '../ai-gateway/ai-gateway.types';
import { normalizeUseCase } from '../ai-gateway/use-cases';
import { IntentStage } from './intent.types';
import { buildIntentShortId, normalizeIntentName } from './intent.utils';

const INTENT_COACH_FIELDS = ['goal', 'context', 'scope', 'kpi', 'risks'] as const;

type IntentCoachField = (typeof INTENT_COACH_FIELDS)[number];

const COACH_TASKS_DEFAULT = [
  'intent_structuring',
  'intent_gap_detection',
  'clarifying_questions',
  'summary_internal',
] as const;

type CoachTask = (typeof COACH_TASKS_DEFAULT)[number];

const COACH_TASKS_SUPPORTED = new Set<string>(COACH_TASKS_DEFAULT as readonly string[]);

const MAX_L2_SOURCE_CHARS = 4000;

type CoachSuggestionKind = 'missing_info' | 'question' | 'risk' | 'rewrite' | 'summary';
type CoachSuggestionFeedbackSentiment = 'UP' | 'DOWN' | 'NEUTRAL';
type CoachSuggestionFeedbackReasonCode =
  | 'HELPFUL_STRUCTURING'
  | 'TOO_GENERIC'
  | 'INCORRECT_ASSUMPTION'
  | 'MISSING_CONTEXT'
  | 'NOT_RELEVANT'
  | 'ALREADY_KNOWN'
  | 'OTHER';

const INTENT_COACH_FIELD_LABELS: Record<IntentCoachField, string> = {
  goal: 'Goal',
  context: 'Context',
  scope: 'Scope',
  kpi: 'KPIs',
  risks: 'Risks',
};

type CoachSuggestionDraft = {
  kind: CoachSuggestionKind;
  title: string;
  l1Text: string;
  actionable: boolean;
  evidenceRef?: string;
  proposedPatch?: {
    fields: Record<string, string | null>;
  };
  targetField?: string | null;
};

type DraftFieldSuggestion = {
  field: IntentCoachField;
  title: string;
  l1Text: string;
  actionable: boolean;
  evidenceRef?: string;
  proposedPatch?: {
    fields: Record<string, string | null>;
  };
};

type MissingInfoRule = {
  field: string;
  label: string;
  suggestion: string;
  question: string;
};

type CoachAiContext = {
  intentId: string;
  requestedDataLevel: 'L1' | 'L2';
  inputClass: 'L1' | 'L2';
  containsL2: boolean;
};

export type CreateIntentInput = {
  orgId: string;
  actorUserId: string;
  intentName: string;
  ownerUserId?: string | null;
  client?: string | null;
  language?: string | null;
  goal?: string | null;
  title?: string | null;
  sourceTextRaw?: string | null;
  context?: string | null;
  scope?: string | null;
  kpi?: string | null;
  risks?: string | null;
  deadlineAt?: Date | null;
};

export type UpdateIntentInput = {
  orgId: string;
  actorUserId: string;
  intentId: string;
  intentName?: string | null;
  ownerUserId?: string | null;
  client?: string | null;
  language?: string | null;
  goal?: string | null;
  context?: string | null;
  scope?: string | null;
  kpi?: string | null;
  risks?: string | null;
  deadlineAt?: Date | null;
  pipelineStage?: IntentStage;
};

export type ListIntentInput = {
  orgId: string;
  q?: string | null;
  statuses?: IntentStage[];
  ownerId?: string | null;
  language?: string | null;
  from?: Date;
  to?: Date;
  sort?: 'lastActivityAt' | 'createdAt';
  order?: 'asc' | 'desc';
  limit?: number;
  cursor?: string | null;
};

export type RunIntentCoachInput = {
  orgId: string;
  intentId: string;
  actorUserId?: string;
};

export type SuggestIntentCoachInput = {
  orgId: string;
  intentId: string;
  actorUserId?: string;
  requestedLanguage?: string | null;
  requestedDataLevel?: 'L1' | 'L2';
  tasks?: string[];
  instructions?: string | null;
  focusFields?: string[] | null;
  mode?: 'initial' | 'refine' | 'suggestion_only';
  channel?: 'ui' | 'api';
};

export type DecideIntentCoachSuggestionInput = {
  orgId: string;
  intentId: string;
  suggestionId: string;
  actorUserId?: string;
  rating?: number;
  sentiment?: CoachSuggestionFeedbackSentiment;
  reasonCode?: CoachSuggestionFeedbackReasonCode;
  commentL1?: string | null;
  channel?: 'ui' | 'api';
};

export type UpdatePipelineStageInput = {
  orgId: string;
  actorUserId: string;
  intentId: string;
  pipelineStage: IntentStage;
};

export type UpdateIntentAiAccessInput = {
  orgId: string;
  actorUserId: string;
  intentId: string;
  allowL2: boolean;
  channel?: 'ui' | 'api';
};

@Injectable()
export class IntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly aiGateway: AiGatewayService,
    private readonly aiAccess: AiAccessService,
  ) {}

  async createIntent(input: CreateIntentInput) {
    const org = await this.prisma.organization.findUnique({
      where: { id: input.orgId },
      select: { defaultLanguage: true },
    });
    if (!org) {
      throw new NotFoundException('Org not found');
    }

    const intentName = normalizeIntentName(input.intentName ?? '');
    if (!intentName) {
      throw new BadRequestException('Intent name is required');
    }
    await this.ensureIntentNameAvailable(input.orgId, intentName);

    const rawText = input.sourceTextRaw ?? null;
    const isPaste = Boolean(rawText && rawText.trim().length > 0);
    const title = isPaste ? this.deriveTitle(rawText!, input.title) : input.goal ?? '';
    const goal = isPaste ? title : input.goal ?? '';
    const language = (input.language ?? org.defaultLanguage ?? 'EN').toUpperCase();
    const ownerUserId = input.ownerUserId ?? input.actorUserId;
    const now = new Date();

    const sourceTextSha256 = isPaste ? this.hashText(rawText!) : null;
    const sourceTextLength = isPaste ? rawText!.length : null;

    const intent = await this.prisma.intent.create({
      data: {
        orgId: input.orgId,
        createdByUserId: input.actorUserId,
        ownerUserId,
        client: input.client ?? null,
        intentName,
        language,
        goal,
        title,
        context: input.context ?? null,
        scope: input.scope ?? null,
        kpi: input.kpi ?? null,
        risks: input.risks ?? null,
        deadlineAt: input.deadlineAt ?? null,
        stage: 'NEW',
        confidentialityLevel: 'L1',
        source: isPaste ? 'paste' : 'manual',
        sourceTextRaw: rawText,
        sourceTextSha256,
        sourceTextLength,
        lastActivityAt: now,
      },
    });

    const payload: Record<string, unknown> = {
      payloadVersion: 1,
      intentId: intent.id,
      title: intentName,
      language,
      confidentialityLevel: 'L1',
      source: isPaste ? 'paste' : 'manual',
    };

    if (isPaste) {
      payload.sourceText = {
        sha256: sourceTextSha256,
        length: sourceTextLength,
      };
    } else {
      payload.goal = goal;
      if (input.context) payload.context = input.context;
      if (input.scope) payload.scope = input.scope;
      if (input.kpi) payload.kpi = input.kpi;
      if (input.risks) payload.risks = input.risks;
      if (input.deadlineAt) payload.deadlineAt = input.deadlineAt.toISOString();
    }

    await this.events.emitEvent({
      type: EVENT_TYPES.INTENT_CREATED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: intent.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'ui',
      correlationId: ulid(),
      payload,
    });

    return intent;
  }

  async listIntents(input: ListIntentInput) {
    const take = input.limit && input.limit > 0 ? Math.min(input.limit, 100) : 25;
    const sort = input.sort ?? 'lastActivityAt';
    const order = input.order ?? 'desc';

    const where: Prisma.IntentWhereInput = {
      orgId: input.orgId,
    };

    if (input.statuses && input.statuses.length > 0) {
      where.stage = { in: input.statuses };
    }
    if (input.ownerId) {
      where.ownerUserId = input.ownerId;
    }
    if (input.language) {
      where.language = input.language;
    }
    if (input.q) {
      where.OR = [
        { intentName: { contains: input.q, mode: 'insensitive' } },
        { title: { contains: input.q, mode: 'insensitive' } },
        { client: { contains: input.q, mode: 'insensitive' } },
      ];
    }
    if (input.from || input.to) {
      where.lastActivityAt = {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      };
    }

    const cursor = this.decodeCursor(input.cursor);
    if (cursor && cursor.sort === sort) {
      const cursorFilter: Prisma.IntentWhereInput = {
        OR: [
          {
            [sort]: order === 'desc' ? { lt: cursor.value } : { gt: cursor.value },
          },
          {
            [sort]: cursor.value,
            id: order === 'desc' ? { lt: cursor.id } : { gt: cursor.id },
          },
        ],
      };
      if (where.AND) {
        const existing = Array.isArray(where.AND) ? where.AND : [where.AND];
        where.AND = [...existing, cursorFilter];
      } else {
        where.AND = [cursorFilter];
      }
    }

    const results = await this.prisma.intent.findMany({
      where,
      select: {
        id: true,
        intentNumber: true,
        intentName: true,
        goal: true,
        title: true,
        client: true,
        stage: true,
        ownerUserId: true,
        language: true,
        lastActivityAt: true,
        deadlineAt: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: [{ [sort]: order }, { id: order }],
      take: take + 1,
    });

    const items = results.slice(0, take).map((intent) => ({
      ...intent,
      status: intent.stage,
      shortId: buildIntentShortId(intent.intentNumber),
      owner: intent.owner
        ? {
            id: intent.owner.id,
            email: intent.owner.email,
            name: null,
          }
        : null,
    }));

    const nextCursor =
      results.length > take && items.length
        ? this.encodeCursor(items[items.length - 1], sort)
        : null;

    return { items, nextCursor };
  }

  async getIntentDetail(input: { orgId: string; intentId: string }) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: {
        id: true,
        intentNumber: true,
        intentName: true,
        goal: true,
        title: true,
        client: true,
        stage: true,
        language: true,
        lastActivityAt: true,
        deadlineAt: true,
        ownerUserId: true,
        context: true,
        scope: true,
        kpi: true,
        risks: true,
        sourceTextRaw: true,
        aiAllowL2: true,
        aiAllowL2SetAt: true,
        aiAllowL2SetByUserId: true,
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const hasL2Attachments = await this.prisma.attachment.count({
      where: { intentId: intent.id, orgId: input.orgId, blob: { confidentiality: 'L2' } },
    });
    const hasL2Source = Boolean(intent.sourceTextRaw && intent.sourceTextRaw.trim());
    const hasL2 = hasL2Source || hasL2Attachments > 0;

    return {
      ...intent,
      shortId: buildIntentShortId(intent.intentNumber),
      hasL2,
    };
  }

  async updateIntentAiAccess(input: UpdateIntentAiAccessInput) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: { id: true, stage: true, aiAllowL2: true },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    if (input.allowL2) {
      await this.aiAccess.ensureToggleAllowed({ orgId: input.orgId });
    }

    if (intent.aiAllowL2 === input.allowL2) {
      return { intent };
    }

    const now = new Date();
    const updated = await this.prisma.intent.update({
      where: { id: intent.id },
      data: {
        aiAllowL2: input.allowL2,
        aiAllowL2SetAt: now,
        aiAllowL2SetByUserId: input.actorUserId,
      },
      select: { id: true, stage: true, aiAllowL2: true },
    });

    await this.events.emitEvent({
      type: EVENT_TYPES.INTENT_AI_ACCESS_UPDATED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: intent.id,
      lifecycleStep: this.mapLifecycleStep((intent.stage as IntentStage) ?? 'NEW'),
      pipelineStage: (intent.stage as IntentStage) ?? 'NEW',
      channel: input.channel ?? 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: intent.id,
        allowL2: input.allowL2,
        previousAllowL2: intent.aiAllowL2,
      },
    });

    return { intent: updated };
  }

  async runIntentCoach(input: RunIntentCoachInput) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: {
        id: true,
        intentName: true,
        goal: true,
        title: true,
        client: true,
        language: true,
        context: true,
        scope: true,
        kpi: true,
        risks: true,
        deadlineAt: true,
        stage: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    await this.ensureAiPolicyEnabled(input.orgId);
    if (!this.hasSufficientCoachData(intent)) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const messages = this.buildIntentCoachMessages(intent);
    if (!messages) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const response = await this.aiGateway.generateText({
      tenantId: input.orgId,
      userId: input.actorUserId ?? null,
      intentId: intent.id,
      useCase: 'intent_gap_detection',
      messages,
      inputClass: 'L1',
      containsL2: false,
      requestedDataLevel: 'L1',
    });

    return {
      status: 'completed',
      intentId: intent.id,
      text: response.text,
      model: response.model,
      requestId: response.requestId,
    };
  }

  async suggestIntentCoach(input: SuggestIntentCoachInput) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: {
        id: true,
        orgId: true,
        intentName: true,
        goal: true,
        language: true,
        client: true,
        context: true,
        scope: true,
        kpi: true,
        risks: true,
        deadlineAt: true,
        stage: true,
        sourceTextRaw: true,
        aiAllowL2: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    await this.ensureAiPolicyEnabled(input.orgId);
    const requestedDataLevel = this.normalizeRequestedDataLevel(input.requestedDataLevel);
    let allowL2 = false;
    if (requestedDataLevel === 'L2') {
      const access = await this.aiAccess.resolveAiDataAccess({
        orgId: input.orgId,
        intentId: intent.id,
        actorUserId: input.actorUserId ?? null,
        intent: { id: intent.id, orgId: intent.orgId, aiAllowL2: intent.aiAllowL2 },
      });
      if (!access.allowL2) {
        throw new ForbiddenException(access.reason ?? 'AI_L2_NOT_ALLOWED');
      }
      allowL2 = true;
    }

    const hasSufficientL1 = this.hasSufficientCoachData(intent);
    if (!hasSufficientL1 && requestedDataLevel === 'L1') {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const l1Context = this.buildIntentCoachContext(intent);
    const l2Context = allowL2 ? this.buildIntentL2Context(intent.sourceTextRaw) : null;
    if (!hasSufficientL1 && !l2Context) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const coachContext = this.combineCoachContext(l1Context, l2Context);
    if (!coachContext) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const aiContext: CoachAiContext = {
      intentId: intent.id,
      requestedDataLevel,
      inputClass: l2Context ? 'L2' : 'L1',
      containsL2: Boolean(l2Context),
    };

    const requestedLanguage = (input.requestedLanguage || intent.language || 'EN').toUpperCase();
    const coachRunId = ulid();
    const instructions = this.normalizeOptionalText(input.instructions);
    const focusFields = this.normalizeCoachFields(input.focusFields);
    const targetFields = focusFields.length ? focusFields : [...INTENT_COACH_FIELDS];
    const focusFieldSet = focusFields.length ? new Set<string>(focusFields) : null;
    const tasks = this.normalizeCoachTasks(input.tasks);
    const includeSummary = tasks.includes('summary_internal');
    const includeStructuring = tasks.includes('intent_structuring');
    const includeGapDetection = tasks.includes('intent_gap_detection');
    const includeQuestions = tasks.includes('clarifying_questions');
    const channel = input.channel ?? 'ui';

    const summaryBlock = includeSummary
      ? await this.generateSummaryBlock({
        tenantId: input.orgId,
        userId: input.actorUserId,
        context: coachContext,
        requestedLanguage,
        instructions,
        aiContext,
      })
      : [];

    const now = new Date();
    await this.prisma.intentCoachRun.create({
      data: {
        id: coachRunId,
        orgId: input.orgId,
        intentId: intent.id,
        createdByUserId: input.actorUserId ?? null,
        summaryItems: summaryBlock,
        instructions: instructions ?? null,
        focusFields: focusFields.length ? focusFields : undefined,
        createdAt: now,
      },
    });

    const suggestions: CoachSuggestionDraft[] = [];
    if (includeStructuring) {
      const fieldSuggestions = await this.generateFieldSuggestions({
        intent,
        tenantId: input.orgId,
        userId: input.actorUserId,
        context: coachContext,
        requestedLanguage,
        instructions,
        fields: targetFields,
        aiContext,
      });
      suggestions.push(
        ...fieldSuggestions.map((suggestion) => ({
          kind: 'rewrite' as const,
          title: suggestion.title,
          l1Text: suggestion.l1Text,
          actionable: suggestion.actionable,
          evidenceRef: suggestion.evidenceRef,
          proposedPatch: suggestion.proposedPatch,
          targetField: suggestion.field,
        })),
      );
    }
    if (includeGapDetection) {
      suggestions.push(...this.generateMissingInfoSuggestions(intent, focusFieldSet));
      suggestions.push(...this.generateRiskSuggestions(intent, focusFieldSet));
    }
    if (includeQuestions) {
      suggestions.push(...this.generateQuestionSuggestions(intent, focusFieldSet));
    }

    const created = suggestions.length
      ? await this.prisma.$transaction(
          suggestions.map((suggestion) =>
            this.prisma.avatarSuggestion.create({
                data: {
                  id: randomUUID(),
                  orgId: input.orgId,
                  intentId: intent.id,
                  coachRunId,
                  avatarType: 'INTENT_COACH',
                  kind: suggestion.kind,
                  subjectType: 'INTENT',
                  subjectId: intent.id,
                  targetField: suggestion.targetField ?? null,
                  title: suggestion.title,
                  l1Text: suggestion.l1Text,
                  evidenceRef: suggestion.evidenceRef ?? null,
                  proposedPatch: suggestion.proposedPatch ?? undefined,
                  language: intent.language ?? null,
                  status: 'ISSUED',
                  actionable: suggestion.actionable,
                  createdAt: now,
                },
            }),
          ),
        )
      : [];

    for (const suggestion of created) {
      const l1Text = this.normalizeOptionalText(suggestion.l1Text);
      const suggestionRef = this.normalizeOptionalText(suggestion.evidenceRef);
      await this.events.emitEvent({
        type: EVENT_TYPES.AVATAR_SUGGESTION_ISSUED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        actorOrgId: input.orgId,
        subjectType: 'INTENT',
        subjectId: intent.id,
        lifecycleStep: this.mapLifecycleStep(intent.stage as IntentStage),
        pipelineStage: intent.stage as IntentStage,
        channel,
        correlationId: coachRunId,
        payload: {
          payloadVersion: 1,
          intentId: intent.id,
          avatarType: 'INTENT_COACH',
          suggestionId: suggestion.id,
          suggestionKind: suggestion.kind,
          suggestionL1Text: l1Text ?? undefined,
          suggestionRef: suggestionRef ?? undefined,
        },
      });
    }

    return {
      coachRunId,
      intentId: intent.id,
      summaryBlock,
      suggestions: created.map((suggestion) => ({
        id: suggestion.id,
        kind: suggestion.kind,
        title: suggestion.title,
        l1Text: suggestion.l1Text,
        evidenceRef: suggestion.evidenceRef,
        status: suggestion.status,
        proposedPatch: suggestion.proposedPatch,
        actionable: suggestion.actionable,
        targetField: suggestion.targetField,
      })),
    };
  }

  async getIntentCoachHistory(input: { orgId: string; intentId: string }) {
    const runs = await this.prisma.intentCoachRun.findMany({
      where: { orgId: input.orgId, intentId: input.intentId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        summaryItems: true,
      },
    });
    return {
      intentId: input.intentId,
      items: runs.map((run) => ({
        id: run.id,
        createdAt: run.createdAt,
        summaryItems: Array.isArray(run.summaryItems) ? run.summaryItems : [],
      })),
    };
  }

  async acceptIntentCoachSuggestion(input: DecideIntentCoachSuggestionInput) {
    const suggestion = await this.prisma.avatarSuggestion.findFirst({
      where: { id: input.suggestionId, orgId: input.orgId, intentId: input.intentId },
      include: { intent: { select: { stage: true } } },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.status !== 'ISSUED') {
      return { suggestion, appliedFields: [] };
    }

    const channel = input.channel ?? 'ui';
    const appliedFields = suggestion.actionable
      ? await this.applySuggestionPatch({
          orgId: input.orgId,
          intentId: input.intentId,
          actorUserId: input.actorUserId,
          proposedPatch: suggestion.proposedPatch,
          channel,
        })
      : [];

    const now = new Date();
    const lifecycleStep = this.mapLifecycleStep((suggestion.intent?.stage as IntentStage) ?? 'NEW');
    const pipelineStage = (suggestion.intent?.stage as IntentStage) ?? 'NEW';
    const feedback = this.normalizeSuggestionFeedback({
      rating: input.rating,
      sentiment: input.sentiment,
      reasonCode: input.reasonCode,
      commentL1: input.commentL1,
    });
    const updated = await this.prisma.avatarSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'ACCEPTED',
        decidedAt: now,
        decidedByUserId: input.actorUserId ?? null,
      },
    });

    const correlationId = suggestion.coachRunId ?? ulid();
    await this.events.emitEvent({
      type: EVENT_TYPES.AVATAR_SUGGESTION_ACCEPTED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: input.intentId,
      lifecycleStep,
      pipelineStage,
      channel,
      correlationId,
      payload: {
        payloadVersion: 1,
        suggestionId: suggestion.id,
        intentId: input.intentId,
        appliedFields,
      },
    });

    if (feedback) {
      await this.prisma.avatarSuggestionFeedback.create({
        data: {
          orgId: input.orgId,
          intentId: input.intentId,
          suggestionId: suggestion.id,
          userId: input.actorUserId ?? null,
          decision: 'ACCEPTED',
          rating: feedback.rating ?? undefined,
          sentiment: feedback.sentiment ?? undefined,
          reasonCode: feedback.reasonCode ?? undefined,
          commentL1: feedback.commentL1 ?? undefined,
        },
      });
      await this.events.emitEvent({
        type: EVENT_TYPES.AVATAR_SUGGESTION_FEEDBACK,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        actorOrgId: input.orgId,
        subjectType: 'INTENT',
        subjectId: input.intentId,
        lifecycleStep,
        pipelineStage,
        channel,
        correlationId: suggestion.coachRunId ?? suggestion.id,
        payload: {
          payloadVersion: 1,
          orgId: input.orgId,
          intentId: input.intentId,
          suggestionId: suggestion.id,
          avatarType: suggestion.avatarType,
          suggestionKind: suggestion.kind,
          decision: 'ACCEPTED',
          ...(feedback.rating !== undefined ? { rating: feedback.rating } : {}),
          ...(feedback.sentiment ? { sentiment: feedback.sentiment } : {}),
          ...(feedback.reasonCode ? { reasonCode: feedback.reasonCode } : {}),
          ...(feedback.commentL1 ? { commentL1: feedback.commentL1 } : {}),
        },
      });
    }

    return { suggestion: updated, appliedFields };
  }

  async rejectIntentCoachSuggestion(input: DecideIntentCoachSuggestionInput) {
    const suggestion = await this.prisma.avatarSuggestion.findFirst({
      where: { id: input.suggestionId, orgId: input.orgId, intentId: input.intentId },
      include: { intent: { select: { stage: true } } },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.status !== 'ISSUED') {
      return { suggestion };
    }

    const now = new Date();
    const lifecycleStep = this.mapLifecycleStep((suggestion.intent?.stage as IntentStage) ?? 'NEW');
    const pipelineStage = (suggestion.intent?.stage as IntentStage) ?? 'NEW';
    const feedback = this.normalizeSuggestionFeedback({
      rating: input.rating,
      sentiment: input.sentiment,
      reasonCode: input.reasonCode,
      commentL1: input.commentL1,
    });
    const updated = await this.prisma.avatarSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'REJECTED',
        decidedAt: now,
        decidedByUserId: input.actorUserId ?? null,
      },
    });

    const channel = input.channel ?? 'ui';
    const correlationId = suggestion.coachRunId ?? ulid();
    await this.events.emitEvent({
      type: EVENT_TYPES.AVATAR_SUGGESTION_REJECTED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: input.intentId,
      lifecycleStep,
      pipelineStage,
      channel,
      correlationId,
      payload: {
        payloadVersion: 1,
        suggestionId: suggestion.id,
        intentId: input.intentId,
        reasonCode: input.reasonCode,
      },
    });

    if (feedback) {
      await this.prisma.avatarSuggestionFeedback.create({
        data: {
          orgId: input.orgId,
          intentId: input.intentId,
          suggestionId: suggestion.id,
          userId: input.actorUserId ?? null,
          decision: 'REJECTED',
          rating: feedback.rating ?? undefined,
          sentiment: feedback.sentiment ?? undefined,
          reasonCode: feedback.reasonCode ?? undefined,
          commentL1: feedback.commentL1 ?? undefined,
        },
      });
      await this.events.emitEvent({
        type: EVENT_TYPES.AVATAR_SUGGESTION_FEEDBACK,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        actorOrgId: input.orgId,
        subjectType: 'INTENT',
        subjectId: input.intentId,
        lifecycleStep,
        pipelineStage,
        channel,
        correlationId: suggestion.coachRunId ?? suggestion.id,
        payload: {
          payloadVersion: 1,
          orgId: input.orgId,
          intentId: input.intentId,
          suggestionId: suggestion.id,
          avatarType: suggestion.avatarType,
          suggestionKind: suggestion.kind,
          decision: 'REJECTED',
          ...(feedback.rating !== undefined ? { rating: feedback.rating } : {}),
          ...(feedback.sentiment ? { sentiment: feedback.sentiment } : {}),
          ...(feedback.reasonCode ? { reasonCode: feedback.reasonCode } : {}),
          ...(feedback.commentL1 ? { commentL1: feedback.commentL1 } : {}),
        },
      });
    }

    return { suggestion: updated };
  }

  private buildIntentCoachContext(intent: {
    intentName: string;
    goal: string;
    language?: string | null;
    client?: string | null;
    context?: string | null;
    scope?: string | null;
    kpi?: string | null;
    risks?: string | null;
    deadlineAt?: Date | null;
    stage?: string | null;
  }): string | null {
    const lines: string[] = [];
    const addLine = (label: string, value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      const capped = trimmed.length > 600 ? `${trimmed.slice(0, 600)}...` : trimmed;
      lines.push(`${label}: ${capped}`);
    };

    addLine('Intent name', intent.intentName);
    addLine('Goal', intent.goal);
    addLine('Language', intent.language);
    addLine('Client', intent.client);
    addLine('Context', intent.context);
    addLine('Scope', intent.scope);
    addLine('KPIs', intent.kpi);
    addLine('Risks', intent.risks);
    if (intent.deadlineAt) {
      lines.push(`Deadline: ${intent.deadlineAt.toISOString()}`);
    }
    if (intent.stage) {
      lines.push(`Stage: ${intent.stage}`);
    }

    if (lines.length === 0) {
      return null;
    }
    return lines.join('\n');
  }

  private buildIntentL2Context(sourceTextRaw?: string | null): string | null {
    const trimmed = this.normalizeOptionalText(sourceTextRaw);
    if (!trimmed) return null;
    const capped =
      trimmed.length > MAX_L2_SOURCE_CHARS
        ? `${trimmed.slice(0, MAX_L2_SOURCE_CHARS)}...`
        : trimmed;
    return `Confidential source text (L2):\n${capped}`;
  }

  private combineCoachContext(l1Context?: string | null, l2Context?: string | null): string | null {
    if (l1Context && l2Context) {
      return `${l1Context}\n\n${l2Context}`;
    }
    return l1Context ?? l2Context ?? null;
  }

  private normalizeCoachFields(fields?: string[] | null): IntentCoachField[] {
    if (!fields || fields.length === 0) {
      return [];
    }
    const normalized = fields
      .map((field) => field.trim().toLowerCase())
      .filter(Boolean);
    const allowed = new Set(INTENT_COACH_FIELDS);
    const selected = normalized.filter((field) => allowed.has(field as IntentCoachField));
    return INTENT_COACH_FIELDS.filter((field) => selected.includes(field));
  }

  private normalizeCoachTasks(tasks?: string[] | null): CoachTask[] {
    if (!tasks || tasks.length === 0) {
      return [...COACH_TASKS_DEFAULT];
    }
    const normalized: CoachTask[] = [];
    for (const rawTask of tasks) {
      let useCase: string;
      try {
        useCase = normalizeUseCase(rawTask);
      } catch {
        throw new BadRequestException('COACH_TASK_INVALID');
      }
      if (!COACH_TASKS_SUPPORTED.has(useCase)) {
        throw new BadRequestException('COACH_TASK_UNSUPPORTED');
      }
      if (!normalized.includes(useCase as CoachTask)) {
        normalized.push(useCase as CoachTask);
      }
    }
    return normalized.length ? normalized : [...COACH_TASKS_DEFAULT];
  }

  private normalizeRequestedDataLevel(value?: string | null): 'L1' | 'L2' {
    if (value && value.toUpperCase() === 'L2') {
      return 'L2';
    }
    return 'L1';
  }

  private async ensureAiPolicyEnabled(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { policyAiEnabled: true },
    });
    if (!org || !org.policyAiEnabled) {
      throw new ForbiddenException('AI_POLICY_DISABLED');
    }
  }

  private hasSufficientCoachData(intent: {
    goal: string;
    client?: string | null;
    context?: string | null;
    scope?: string | null;
    kpi?: string | null;
    risks?: string | null;
    deadlineAt?: Date | null;
  }): boolean {
    const textFields = [
      intent.goal,
      intent.client,
      intent.context,
      intent.scope,
      intent.kpi,
      intent.risks,
    ];
    let filled = 0;
    let totalChars = 0;
    for (const value of textFields) {
      const trimmed = this.normalizeOptionalText(value);
      if (trimmed) {
        filled += 1;
        totalChars += trimmed.length;
      }
    }
    if (intent.deadlineAt) {
      filled += 1;
    }
    return filled >= 2 || totalChars >= 120;
  }

  private shouldIncludeForFocus(
    targetField: string | null | undefined,
    focusFields?: Set<string> | null,
  ): boolean {
    if (!focusFields || focusFields.size === 0) {
      return true;
    }
    if (!targetField) {
      return false;
    }
    return focusFields.has(targetField);
  }

  private generateMissingInfoSuggestions(
    intent: {
      client?: string | null;
      context?: string | null;
      scope?: string | null;
      kpi?: string | null;
      risks?: string | null;
      deadlineAt?: Date | null;
    },
    focusFields?: Set<string> | null,
  ): CoachSuggestionDraft[] {
    const rules: MissingInfoRule[] = [];
    if (!this.normalizeOptionalText(intent.context)) {
      rules.push({
        field: 'context',
        label: 'Context',
        suggestion: 'Add business background and key constraints.',
        question: 'What is the business context and background?',
      });
    }
    if (!this.normalizeOptionalText(intent.scope)) {
      rules.push({
        field: 'scope',
        label: 'Scope',
        suggestion: 'Add scope boundaries, deliverables, or exclusions.',
        question: 'What is in scope and what is explicitly out of scope?',
      });
    }
    if (!this.normalizeOptionalText(intent.kpi)) {
      rules.push({
        field: 'kpi',
        label: 'KPIs',
        suggestion: 'Add success metrics or measurable outcomes.',
        question: 'Which KPIs define success for this intent?',
      });
    }
    if (!this.normalizeOptionalText(intent.risks)) {
      rules.push({
        field: 'risks',
        label: 'Risks',
        suggestion: 'Add known risks or dependencies that could affect delivery.',
        question: 'What are the known risks or dependencies?',
      });
    }
    if (!intent.deadlineAt) {
      rules.push({
        field: 'deadlineAt',
        label: 'Timeline',
        suggestion: 'Add a target start date and deadline or timeline window.',
        question: 'What is the target start date and deadline?',
      });
    }
    if (!this.normalizeOptionalText(intent.client)) {
      rules.push({
        field: 'client',
        label: 'Client',
        suggestion: 'Specify the client or counterpart organization.',
        question: 'Who is the client or counterpart for this intent?',
      });
    }

    return rules
      .filter((rule) => this.shouldIncludeForFocus(rule.field, focusFields))
      .map((rule) => ({
        kind: 'missing_info',
        title: `Missing ${rule.label}`,
        l1Text: rule.suggestion,
        actionable: false,
        evidenceRef: `field:${rule.field} empty`,
        targetField: rule.field,
      }));
  }

  private generateQuestionSuggestions(
    intent: {
      client?: string | null;
      context?: string | null;
      scope?: string | null;
      kpi?: string | null;
      risks?: string | null;
      deadlineAt?: Date | null;
    },
    focusFields?: Set<string> | null,
  ): CoachSuggestionDraft[] {
    const rules: MissingInfoRule[] = [];
    if (!this.normalizeOptionalText(intent.context)) {
      rules.push({
        field: 'context',
        label: 'Context',
        suggestion: '',
        question: 'What is the business context and background?',
      });
    }
    if (!this.normalizeOptionalText(intent.scope)) {
      rules.push({
        field: 'scope',
        label: 'Scope',
        suggestion: '',
        question: 'What is in scope and what is explicitly out of scope?',
      });
    }
    if (!this.normalizeOptionalText(intent.kpi)) {
      rules.push({
        field: 'kpi',
        label: 'KPIs',
        suggestion: '',
        question: 'Which KPIs define success for this intent?',
      });
    }
    if (!this.normalizeOptionalText(intent.risks)) {
      rules.push({
        field: 'risks',
        label: 'Risks',
        suggestion: '',
        question: 'What are the known risks or dependencies?',
      });
    }
    if (!intent.deadlineAt) {
      rules.push({
        field: 'deadlineAt',
        label: 'Timeline',
        suggestion: '',
        question: 'What is the target start date and deadline?',
      });
    }
    if (!this.normalizeOptionalText(intent.client)) {
      rules.push({
        field: 'client',
        label: 'Client',
        suggestion: '',
        question: 'Who is the client or counterpart for this intent?',
      });
    }

    return rules
      .filter((rule) => this.shouldIncludeForFocus(rule.field, focusFields))
      .map((rule) => ({
        kind: 'question',
        title: `Clarify ${rule.label}`,
        l1Text: rule.question,
        actionable: false,
        evidenceRef: `field:${rule.field} empty`,
        targetField: rule.field,
      }));
  }

  private generateRiskSuggestions(
    intent: {
      goal: string;
      context?: string | null;
      scope?: string | null;
      kpi?: string | null;
      risks?: string | null;
      deadlineAt?: Date | null;
    },
    focusFields?: Set<string> | null,
  ): CoachSuggestionDraft[] {
    const suggestions: CoachSuggestionDraft[] = [];
    const seen = new Set<string>();
    const addRisk = (suggestion: CoachSuggestionDraft) => {
      if (seen.has(suggestion.title)) return;
      if (!this.shouldIncludeForFocus(suggestion.targetField, focusFields)) return;
      seen.add(suggestion.title);
      suggestions.push(suggestion);
    };

    const goal = this.normalizeOptionalText(intent.goal) ?? '';
    const hasContext = Boolean(this.normalizeOptionalText(intent.context));
    const hasScope = Boolean(this.normalizeOptionalText(intent.scope));
    const hasKpi = Boolean(this.normalizeOptionalText(intent.kpi));
    const hasRisks = Boolean(this.normalizeOptionalText(intent.risks));
    const hasDeadline = Boolean(intent.deadlineAt);

    if (hasScope && !hasDeadline) {
      addRisk({
        kind: 'risk',
        title: 'Scope without timeline',
        l1Text: 'Scope is defined but the timeline/deadline is missing.',
        actionable: false,
        evidenceRef: 'heuristic:scope_without_deadline',
        targetField: 'deadlineAt',
      });
    }
    if (hasScope && !hasKpi) {
      addRisk({
        kind: 'risk',
        title: 'Scope without success metrics',
        l1Text: 'Scope is defined but KPIs are missing, which increases alignment risk.',
        actionable: false,
        evidenceRef: 'heuristic:scope_without_kpi',
        targetField: 'kpi',
      });
    }
    if (!hasRisks && (hasScope || hasContext)) {
      addRisk({
        kind: 'risk',
        title: 'Risks not assessed',
        l1Text: 'Risks section is empty despite defined scope/context.',
        actionable: false,
        evidenceRef: 'field:risks empty',
        targetField: 'risks',
      });
    }
    if (goal.length > 0 && goal.length < 20 && !hasContext) {
      addRisk({
        kind: 'risk',
        title: 'Very short goal with missing context',
        l1Text: 'Goal is brief and context is missing, which may reduce clarity.',
        actionable: false,
        evidenceRef: 'heuristic:goal_short_context_missing',
        targetField: 'context',
      });
    }

    return suggestions;
  }

  private async generateSummaryBlock(input: {
    tenantId: string;
    userId?: string;
    context: string;
    requestedLanguage: string;
    instructions?: string | null;
    aiContext: CoachAiContext;
  }): Promise<string[]> {
    const instructionLine = input.instructions
      ? `User instructions: ${input.instructions}`
      : null;
    const prompt = [
      'Write 4-10 bullet points with: summary, opinions, gaps, observations, and risks.',
      'Be concise, business-neutral, and do not include names or emails.',
    ].join(' ');
    const context = instructionLine
      ? `${input.context}\n\n${instructionLine}`
      : input.context;

    const bullets = await this.runCoachBulletTask({
      tenantId: input.tenantId,
      userId: input.userId,
      useCase: 'summary_internal',
      prompt,
      context,
      requestedLanguage: input.requestedLanguage,
      aiContext: input.aiContext,
    });

    const normalized = bullets
      .map((item) => this.truncateText(item, 260))
      .filter(Boolean)
      .slice(0, 10);

    return normalized.length ? normalized : ['Brak wystarczających danych do podsumowania.'];
  }

  private async generateFieldSuggestions(input: {
    intent: {
      goal: string;
      context?: string | null;
      scope?: string | null;
      kpi?: string | null;
      risks?: string | null;
    };
    tenantId: string;
    userId?: string;
    context: string;
    requestedLanguage: string;
    instructions?: string | null;
    fields: IntentCoachField[];
    aiContext: CoachAiContext;
  }): Promise<DraftFieldSuggestion[]> {
    const fields = input.fields.length ? input.fields : [...INTENT_COACH_FIELDS];
    const instructionLine = input.instructions
      ? `User instructions: ${input.instructions}`
      : null;
    const prompt = [
      'Return JSON only.',
      'For each field, decide if an update is helpful.',
      'If no change is needed, set action to "no_change".',
      `Fields: ${fields.join(', ')}.`,
      'JSON schema: {"items":[{"field":"goal","action":"update","value":"...","rationale":"..."},{"field":"goal","action":"no_change"}]}',
      'Keep values concise and avoid names or emails.',
    ].join(' ');
    const context = instructionLine
      ? `${input.context}\n\n${instructionLine}`
      : input.context;

    const data = await this.runCoachJsonTask({
      tenantId: input.tenantId,
      userId: input.userId,
      useCase: 'intent_structuring',
      prompt,
      context,
      requestedLanguage: input.requestedLanguage,
      aiContext: input.aiContext,
    });

    const items = Array.isArray((data as any)?.items) ? ((data as any).items as any[]) : [];
    const suggestions: DraftFieldSuggestion[] = [];

    for (const field of fields) {
      const label = INTENT_COACH_FIELD_LABELS[field];
      const currentValue = this.normalizeOptionalText(
        (input.intent as Record<string, string | null | undefined>)[field],
      );
      const displayValue = currentValue ?? '';
      const item = items.find(
        (entry) => typeof entry?.field === 'string' && entry.field.toLowerCase() === field,
      );
      const action = typeof item?.action === 'string' ? item.action.toLowerCase() : 'no_change';
      const rawValue = typeof item?.value === 'string' ? item.value.trim() : '';
      const candidate = rawValue ? this.truncateText(rawValue, 800) : '';

      if (action === 'update' && candidate) {
        if (candidate === (currentValue ?? '').trim()) {
          suggestions.push({
            field,
            title: label,
            l1Text: displayValue,
            actionable: false,
            evidenceRef: 'ai:intent_structuring',
          });
          continue;
        }
        suggestions.push({
          field,
          title: label,
          l1Text: candidate,
          actionable: true,
          evidenceRef: 'ai:intent_structuring',
          proposedPatch: { fields: { [field]: candidate } },
        });
        continue;
      }

      suggestions.push({
        field,
        title: label,
        l1Text: displayValue,
        actionable: false,
        evidenceRef: 'ai:intent_structuring',
      });
    }

    return suggestions;
  }

  private async runCoachBulletTask(input: {
    tenantId: string;
    userId?: string;
    useCase: string;
    prompt: string;
    context: string;
    requestedLanguage: string;
    aiContext: CoachAiContext;
  }): Promise<string[]> {
    const messages: AiGatewayMessage[] = [
      {
        role: 'system',
        content: [
          'You are an Intent Coach.',
          input.prompt,
          `Respond in ${input.requestedLanguage}.`,
          'Use bullet points, keep each bullet concise, and avoid names or emails.',
        ].join(' '),
      },
      { role: 'user', content: input.context },
    ];

    const response = await this.aiGateway.generateText({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      intentId: input.aiContext.intentId,
      useCase: input.useCase,
      messages,
      inputClass: input.aiContext.inputClass,
      containsL2: input.aiContext.containsL2,
      requestedDataLevel: input.aiContext.requestedDataLevel,
      maxOutputTokens: 512,
      temperature: 0.3,
    });

    return response.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[^A-Za-z0-9]+/, '').trim())
      .filter((line) => line.length > 0);
  }

  private async runCoachJsonTask(input: {
    tenantId: string;
    userId?: string;
    useCase: string;
    prompt: string;
    context: string;
    requestedLanguage: string;
    aiContext: CoachAiContext;
  }): Promise<unknown> {
    const messages: AiGatewayMessage[] = [
      {
        role: 'system',
        content: [
          'You are an Intent Coach.',
          input.prompt,
          `Respond in ${input.requestedLanguage}.`,
          'Return JSON only.',
        ].join(' '),
      },
      { role: 'user', content: input.context },
    ];

    const response = await this.aiGateway.generateText({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      intentId: input.aiContext.intentId,
      useCase: input.useCase,
      messages,
      inputClass: input.aiContext.inputClass,
      containsL2: input.aiContext.containsL2,
      requestedDataLevel: input.aiContext.requestedDataLevel,
      maxOutputTokens: 700,
      temperature: 0.2,
    });

    return this.parseJsonPayload(response.text);
  }

  private parseJsonPayload(raw: string): unknown {
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
  }

  private normalizeProposedPatch(
    value: Prisma.JsonValue | null | undefined,
  ): DraftFieldSuggestion['proposedPatch'] | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const rawFields = (value as { fields?: unknown }).fields;
    if (!rawFields || typeof rawFields !== 'object' || Array.isArray(rawFields)) {
      return null;
    }
    const fields: Record<string, string | null> = {};
    for (const [key, rawValue] of Object.entries(rawFields as Record<string, unknown>)) {
      if (typeof rawValue === 'string') {
        fields[key] = rawValue;
      } else if (rawValue === null) {
        fields[key] = null;
      }
    }
    if (Object.keys(fields).length === 0) {
      return null;
    }
    return { fields };
  }

  private async applySuggestionPatch(input: {
    orgId: string;
    intentId: string;
    actorUserId?: string;
    proposedPatch?: Prisma.JsonValue | null;
    channel?: 'ui' | 'api';
  }): Promise<string[]> {
    const patch = this.normalizeProposedPatch(input.proposedPatch);
    if (!patch) return [];

    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: {
        id: true,
        orgId: true,
        goal: true,
        context: true,
        scope: true,
        kpi: true,
        risks: true,
        stage: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const allowedFields = new Set(['goal', 'context', 'scope', 'kpi', 'risks']);
    const updates: Prisma.IntentUncheckedUpdateInput = {};
    const changedFields: string[] = [];

    for (const [field, rawValue] of Object.entries(patch.fields)) {
      if (!allowedFields.has(field)) continue;

      if (rawValue !== null && typeof rawValue !== 'string') {
        continue;
      }
      let normalized = rawValue === null ? null : this.normalizeOptionalText(rawValue);
      if (field === 'goal' && !normalized) {
        continue;
      }
      const intentValue = intent[field as keyof typeof intent];
      if (normalized !== intentValue) {
        (updates as Record<string, unknown>)[field] = normalized;
        changedFields.push(field);
      }
    }

    if (changedFields.length === 0) {
      return [];
    }

    const now = new Date();
    updates.lastActivityAt = now;
    await this.prisma.intent.update({
      where: { id: intent.id },
      data: updates,
    });

    await this.events.emitEvent({
      type: EVENT_TYPES.INTENT_UPDATED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: intent.id,
      lifecycleStep: this.mapLifecycleStep(intent.stage as IntentStage),
      pipelineStage: intent.stage as IntentStage,
      channel: input.channel ?? 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: intent.id,
        changedFields,
        changeSummary: `Updated fields: ${changedFields.join(', ')}`,
      },
    });

    return changedFields;
  }

  private buildIntentCoachMessages(intent: {
    intentName: string;
    goal: string;
    title?: string | null;
    client?: string | null;
    language?: string | null;
    context?: string | null;
    scope?: string | null;
    kpi?: string | null;
    risks?: string | null;
    deadlineAt?: Date | null;
    stage?: string | null;
  }): AiGatewayMessage[] | null {
    const lines: string[] = [];
    const addLine = (label: string, value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      lines.push(`${label}: ${trimmed}`);
    };

    addLine('Intent name', intent.intentName);
    addLine('Goal', intent.goal);
    addLine('Title', intent.title);
    addLine('Client', intent.client);
    addLine('Language', intent.language);
    addLine('Context', intent.context);
    addLine('Scope', intent.scope);
    addLine('KPIs', intent.kpi);
    addLine('Risks', intent.risks);
    if (intent.deadlineAt) {
      lines.push(`Deadline: ${intent.deadlineAt.toISOString()}`);
    }
    if (intent.stage) {
      lines.push(`Stage: ${intent.stage}`);
    }

    if (lines.length === 0) {
      return null;
    }

    return [
      {
        role: 'system',
        content:
          'You are an Intent Coach. Identify missing or unclear information based on the provided fields. Respond with 3-7 concise bullet points.',
      },
      {
        role: 'user',
        content: lines.join('\n'),
      },
    ];
  }

  async updateIntent(input: UpdateIntentInput) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const updates: Prisma.IntentUncheckedUpdateInput = {};
    const changedFields: string[] = [];
    const now = new Date();

    if (input.intentName !== undefined) {
      const normalized = normalizeIntentName(input.intentName ?? '');
      if (!normalized) {
        throw new BadRequestException('Intent name cannot be empty');
      }
      if (normalized !== intent.intentName) {
        await this.ensureIntentNameAvailable(input.orgId, normalized, intent.id);
        updates.intentName = normalized;
        changedFields.push('intentName');
      }
    }

    if (input.client !== undefined) {
      const normalized = this.normalizeOptionalText(input.client);
      if (normalized !== intent.client) {
        updates.client = normalized;
        changedFields.push('client');
      }
    }

    if (input.ownerUserId !== undefined) {
      const normalized = input.ownerUserId?.trim() || null;
      if (normalized !== intent.ownerUserId) {
        updates.ownerUserId = normalized;
        changedFields.push('ownerUserId');
      }
    }

    if (input.language !== undefined) {
      const normalized = input.language?.trim().toUpperCase();
      if (normalized && normalized !== intent.language) {
        updates.language = normalized;
        changedFields.push('language');
      }
    }

    if (input.goal !== undefined) {
      const normalized = this.normalizeOptionalText(input.goal);
      if (normalized !== intent.goal) {
        updates.goal = normalized ?? '';
        changedFields.push('goal');
      }
    }

    if (input.context !== undefined) {
      const normalized = this.normalizeOptionalText(input.context);
      if (normalized !== intent.context) {
        updates.context = normalized;
        changedFields.push('context');
      }
    }

    if (input.scope !== undefined) {
      const normalized = this.normalizeOptionalText(input.scope);
      if (normalized !== intent.scope) {
        updates.scope = normalized;
        changedFields.push('scope');
      }
    }

    if (input.kpi !== undefined) {
      const normalized = this.normalizeOptionalText(input.kpi);
      if (normalized !== intent.kpi) {
        updates.kpi = normalized;
        changedFields.push('kpi');
      }
    }

    if (input.risks !== undefined) {
      const normalized = this.normalizeOptionalText(input.risks);
      if (normalized !== intent.risks) {
        updates.risks = normalized;
        changedFields.push('risks');
      }
    }

    if (input.deadlineAt !== undefined) {
      const normalized = input.deadlineAt ?? null;
      const current = intent.deadlineAt ? intent.deadlineAt.getTime() : null;
      const next = normalized ? normalized.getTime() : null;
      if (current !== next) {
        updates.deadlineAt = normalized;
        changedFields.push('deadlineAt');
      }
    }

    let stageChanged = false;
    let fromStage: IntentStage | null = null;
    let toStage: IntentStage | null = null;
    if (input.pipelineStage) {
      const normalized = input.pipelineStage;
      if (normalized !== intent.stage) {
        updates.stage = normalized;
        stageChanged = true;
        fromStage = intent.stage as IntentStage;
        toStage = normalized;
      }
    }

    if (!stageChanged && changedFields.length === 0) {
      return intent;
    }

    updates.lastActivityAt = now;
    const updated = await this.prisma.intent.update({
      where: { id: intent.id },
      data: updates,
    });

    if (stageChanged && fromStage && toStage) {
      await this.events.emitEvent({
        type: EVENT_TYPES.INTENT_PIPELINE_STAGE_CHANGED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        actorOrgId: input.orgId,
        subjectType: 'INTENT',
        subjectId: intent.id,
        lifecycleStep: this.mapLifecycleStep(toStage),
        pipelineStage: toStage,
        channel: 'ui',
        correlationId: ulid(),
        payload: {
          payloadVersion: 1,
          intentId: intent.id,
          fromStage,
          toStage,
        },
      });
    }

    if (changedFields.length > 0) {
      await this.events.emitEvent({
        type: EVENT_TYPES.INTENT_UPDATED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        actorOrgId: input.orgId,
        subjectType: 'INTENT',
        subjectId: intent.id,
        lifecycleStep: this.mapLifecycleStep((updates.stage as IntentStage) ?? intent.stage),
        pipelineStage: (updates.stage as IntentStage) ?? (intent.stage as IntentStage),
        channel: 'ui',
        correlationId: ulid(),
        payload: {
          payloadVersion: 1,
          intentId: intent.id,
          changedFields,
          changeSummary: `Updated fields: ${changedFields.join(', ')}`,
        },
      });
    }

    return updated;
  }

  async updatePipelineStage(input: UpdatePipelineStageInput) {
    return this.updateIntent({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      intentId: input.intentId,
      pipelineStage: input.pipelineStage,
    });
  }

  private encodeCursor(
    intent: { id: string; lastActivityAt: Date; createdAt: Date },
    sort: 'lastActivityAt' | 'createdAt',
  ) {
    const value = sort === 'createdAt' ? intent.createdAt : intent.lastActivityAt;
    return Buffer.from(
      JSON.stringify({
        sort,
        value: value.toISOString(),
        id: intent.id,
      }),
    ).toString('base64');
  }

  private decodeCursor(cursor?: string | null) {
    if (!cursor) return null;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
        sort?: 'lastActivityAt' | 'createdAt';
        value?: string;
        id?: string;
      };
      if (!decoded?.sort || !decoded?.value || !decoded?.id) {
        return null;
      }
      const parsedDate = new Date(decoded.value);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }
      return {
        sort: decoded.sort,
        value: parsedDate,
        id: decoded.id,
      };
    } catch {
      return null;
    }
  }

  private hashText(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private deriveTitle(rawText: string, titleOverride?: string | null) {
    const override = titleOverride?.trim();
    if (override) {
      return override.length > 80 ? `${override.slice(0, 80)}` : override;
    }
    const firstLine = rawText.split(/\r?\n/)[0]?.trim() || '';
    if (firstLine) {
      return firstLine.length > 80 ? `${firstLine.slice(0, 80)}` : firstLine;
    }
    return 'Intent (pasted email)';
  }

  private mapLifecycleStep(stage: IntentStage): 'CLARIFY' | 'MATCH_ALIGN' | 'COMMIT_ASSURE' {
    if (stage === 'MATCH') {
      return 'MATCH_ALIGN';
    }
    if (stage === 'COMMIT' || stage === 'WON' || stage === 'LOST') {
      return 'COMMIT_ASSURE';
    }
    return 'CLARIFY';
  }

  private normalizeSuggestionFeedback(input: {
    rating?: number;
    sentiment?: CoachSuggestionFeedbackSentiment;
    reasonCode?: CoachSuggestionFeedbackReasonCode;
    commentL1?: string | null;
  }): {
    rating?: number;
    sentiment?: CoachSuggestionFeedbackSentiment;
    reasonCode?: CoachSuggestionFeedbackReasonCode;
    commentL1?: string;
  } | null {
    const rating = typeof input.rating === 'number' ? input.rating : undefined;
    const sentiment = input.sentiment;
    const reasonCode = input.reasonCode;
    const commentL1 = this.sanitizeFeedbackComment(input.commentL1);
    if (!rating && !sentiment && !reasonCode && !commentL1) {
      return null;
    }
    return {
      rating,
      sentiment,
      reasonCode,
      commentL1: commentL1 ?? undefined,
    };
  }

  private sanitizeFeedbackComment(raw: string | null | undefined): string | null {
    const normalized = this.normalizeOptionalText(raw);
    if (!normalized) return null;
    const trimmed = normalized.length > 280 ? normalized.slice(0, 280) : normalized;
    if (this.containsFeedbackPii(trimmed)) {
      return null;
    }
    return trimmed;
  }

  private containsFeedbackPii(text: string): boolean {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phonePattern = /(\+?\d[\d\s().-]{6,}\d)/;
    const nameHintPattern = /\b(name|contact|owner|person|lead)\s*[:\-]/i;
    const honorificPattern = /\b(Mr|Ms|Mrs|Dr)\./i;
    return (
      emailPattern.test(text) ||
      phonePattern.test(text) ||
      nameHintPattern.test(text) ||
      honorificPattern.test(text)
    );
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private async ensureIntentNameAvailable(
    orgId: string,
    intentName: string,
    excludeIntentId?: string,
  ) {
    const existing = await this.prisma.intent.findFirst({
      where: {
        orgId,
        intentName: { equals: intentName, mode: 'insensitive' },
        ...(excludeIntentId ? { id: { not: excludeIntentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Intent name already exists');
    }
  }
}

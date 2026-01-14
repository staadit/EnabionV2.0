import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
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
import type { AiGatewayMessage } from '../ai-gateway/ai-gateway.types';
import { IntentStage } from './intent.types';
import { buildIntentShortId, normalizeIntentName } from './intent.utils';

const INTENT_COACH_TASKS = [
  'intent_gap_detection',
  'clarifying_questions',
  'summary_internal',
] as const;

type IntentCoachTask = (typeof INTENT_COACH_TASKS)[number];

type CoachSuggestionKind = 'missing_info' | 'question' | 'risk' | 'rewrite' | 'summary';

type DraftCoachSuggestion = {
  kind: CoachSuggestionKind;
  title: string;
  l1Text?: string;
  evidenceRef?: string;
  proposedPatch?: {
    fields: Record<string, string | null>;
  };
};

const COACH_REQUIRED_FIELDS: Array<{
  field: keyof Pick<
    Prisma.IntentUncheckedCreateInput,
    'goal' | 'context' | 'scope' | 'kpi' | 'risks' | 'deadlineAt' | 'client' | 'title'
  >;
  label: string;
  question: string;
}> = [
  { field: 'goal', label: 'Goal', question: 'What is the primary goal?' },
  { field: 'scope', label: 'Scope', question: 'What is included and excluded from scope?' },
  { field: 'kpi', label: 'KPIs', question: 'How will success be measured?' },
  { field: 'deadlineAt', label: 'Deadline', question: 'What is the target deadline?' },
  { field: 'context', label: 'Context', question: 'What is the business context?' },
  { field: 'client', label: 'Client', question: 'Who is the client or main stakeholder?' },
  { field: 'title', label: 'Title', question: 'What short title best describes this intent?' },
];

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
  tasks?: string[];
  requestedLanguage?: string | null;
};

export type DecideIntentCoachSuggestionInput = {
  orgId: string;
  intentId: string;
  suggestionId: string;
  actorUserId?: string;
  reasonCode?: string;
};

export type UpdatePipelineStageInput = {
  orgId: string;
  actorUserId: string;
  intentId: string;
  pipelineStage: IntentStage;
};

@Injectable()
export class IntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly aiGateway: AiGatewayService,
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

    const messages = this.buildIntentCoachMessages(intent);
    if (!messages) {
      throw new BadRequestException('INSUFFICIENT_L1_DATA');
    }

    const response = await this.aiGateway.generateText({
      tenantId: input.orgId,
      userId: input.actorUserId ?? null,
      useCase: 'intent_gap_detection',
      messages,
      inputClass: 'L1',
      containsL2: false,
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

    const coachContext = this.buildIntentCoachContext(intent);
    if (!coachContext) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const tasks = this.normalizeCoachTasks(input.tasks);
    const requestedLanguage = (input.requestedLanguage || intent.language || 'EN').toUpperCase();
    const coachRunId = ulid();
    const suggestions: DraftCoachSuggestion[] = [];

    const missingInfo = this.buildMissingInfoSuggestions(intent);
    if (missingInfo.length) {
      suggestions.push(...missingInfo);
    }

    if (tasks.includes('intent_gap_detection')) {
      const aiGaps = await this.runCoachBulletTask({
        tenantId: input.orgId,
        userId: input.actorUserId,
        useCase: 'intent_gap_detection',
        prompt: `List missing or unclear information as 3-7 bullet points. Keep it concise.`,
        context: coachContext,
        requestedLanguage,
      });
      for (const item of aiGaps) {
        suggestions.push({
          kind: 'missing_info',
          title: this.buildSuggestionTitle(item, 'Missing info'),
          l1Text: item,
          evidenceRef: 'ai:intent_gap_detection',
        });
      }
    }

    if (tasks.includes('clarifying_questions')) {
      const aiQuestions = await this.runCoachBulletTask({
        tenantId: input.orgId,
        userId: input.actorUserId,
        useCase: 'clarifying_questions',
        prompt: `Write 3-7 concise clarifying questions as bullet points.`,
        context: coachContext,
        requestedLanguage,
      });
      for (const question of aiQuestions) {
        const text = question.endsWith('?') ? question : `${question}?`;
        suggestions.push({
          kind: 'question',
          title: this.buildSuggestionTitle(text, 'Clarify'),
          l1Text: text,
          evidenceRef: 'ai:clarifying_questions',
        });
      }
    }

    if (tasks.includes('summary_internal')) {
      const summary = await this.runCoachTextTask({
        tenantId: input.orgId,
        userId: input.actorUserId,
        useCase: 'summary_internal',
        prompt: `Write a 2-3 sentence internal summary. Keep it business-neutral.`,
        context: coachContext,
        requestedLanguage,
      });
      if (summary) {
        suggestions.push({
          kind: 'summary',
          title: 'Internal summary',
          l1Text: summary,
          evidenceRef: 'ai:summary_internal',
        });
      }
    }

    const riskSuggestions = this.buildRiskSuggestions(intent);
    if (riskSuggestions.length) {
      suggestions.push(...riskSuggestions);
    }

    const normalized = this.dedupeSuggestions(suggestions);
    if (!normalized.length) {
      throw new HttpException('INSUFFICIENT_L1_DATA', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const now = new Date();
    const created = await this.prisma.$transaction(
      normalized.map((suggestion) =>
        this.prisma.avatarSuggestion.create({
          data: {
            id: randomUUID(),
            orgId: input.orgId,
            intentId: intent.id,
            avatarType: 'INTENT_COACH',
            kind: suggestion.kind,
            title: suggestion.title,
            l1Text: suggestion.l1Text ?? null,
            evidenceRef: suggestion.evidenceRef ?? null,
            proposedPatch: suggestion.proposedPatch ?? null,
            status: 'ISSUED',
            createdAt: now,
          },
        }),
      ),
    );

    for (const suggestion of created) {
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
        channel: 'ui',
        correlationId: coachRunId,
        payload: {
          payloadVersion: 1,
          intentId: intent.id,
          avatarType: 'INTENT_COACH',
          suggestionId: suggestion.id,
          suggestionKind: suggestion.kind,
          suggestionL1Text: suggestion.l1Text ?? undefined,
          suggestionRef: suggestion.evidenceRef ?? undefined,
        },
      });
    }

    return {
      coachRunId,
      intentId: intent.id,
      suggestions: created.map((suggestion) => ({
        id: suggestion.id,
        kind: suggestion.kind,
        title: suggestion.title,
        l1Text: suggestion.l1Text,
        evidenceRef: suggestion.evidenceRef,
        status: suggestion.status,
        proposedPatch: suggestion.proposedPatch,
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

    const appliedFields = await this.applySuggestionPatch({
      orgId: input.orgId,
      intentId: input.intentId,
      actorUserId: input.actorUserId,
      proposedPatch: suggestion.proposedPatch,
    });

    const now = new Date();
    const updated = await this.prisma.avatarSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'ACCEPTED',
        decidedAt: now,
        decidedByUserId: input.actorUserId ?? null,
      },
    });

    await this.events.emitEvent({
      type: EVENT_TYPES.AVATAR_SUGGESTION_ACCEPTED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: input.intentId,
      lifecycleStep: this.mapLifecycleStep((suggestion.intent?.stage as IntentStage) ?? 'NEW'),
      pipelineStage: (suggestion.intent?.stage as IntentStage) ?? 'NEW',
      channel: 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        suggestionId: suggestion.id,
        intentId: input.intentId,
        appliedFields,
      },
    });

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
    const updated = await this.prisma.avatarSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'REJECTED',
        decidedAt: now,
        decidedByUserId: input.actorUserId ?? null,
      },
    });

    await this.events.emitEvent({
      type: EVENT_TYPES.AVATAR_SUGGESTION_REJECTED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: input.intentId,
      lifecycleStep: this.mapLifecycleStep((suggestion.intent?.stage as IntentStage) ?? 'NEW'),
      pipelineStage: (suggestion.intent?.stage as IntentStage) ?? 'NEW',
      channel: 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        suggestionId: suggestion.id,
        intentId: input.intentId,
        reasonCode: input.reasonCode,
      },
    });

    return { suggestion: updated };
  }

  private buildIntentCoachContext(intent: {
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
    return lines.join('\n');
  }

  private normalizeCoachTasks(tasks?: string[]): IntentCoachTask[] {
    if (!tasks || tasks.length === 0) {
      return [...INTENT_COACH_TASKS];
    }
    const normalized = tasks
      .map((task) => task.trim().toLowerCase())
      .filter(Boolean);
    const invalid = normalized.filter(
      (task) => !INTENT_COACH_TASKS.includes(task as IntentCoachTask),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid tasks: ${invalid.join(', ')}`);
    }
    return normalized.length ? (normalized as IntentCoachTask[]) : [...INTENT_COACH_TASKS];
  }

  private async runCoachBulletTask(input: {
    tenantId: string;
    userId?: string;
    useCase: IntentCoachTask;
    prompt: string;
    context: string;
    requestedLanguage: string;
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
      useCase: input.useCase,
      messages,
      inputClass: 'L1',
      containsL2: false,
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

  private async runCoachTextTask(input: {
    tenantId: string;
    userId?: string;
    useCase: IntentCoachTask;
    prompt: string;
    context: string;
    requestedLanguage: string;
  }): Promise<string | null> {
    const messages: AiGatewayMessage[] = [
      {
        role: 'system',
        content: [
          'You are an Intent Coach.',
          input.prompt,
          `Respond in ${input.requestedLanguage}.`,
          'Avoid names or emails and keep it short.',
        ].join(' '),
      },
      { role: 'user', content: input.context },
    ];

    const response = await this.aiGateway.generateText({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      useCase: input.useCase,
      messages,
      inputClass: 'L1',
      containsL2: false,
      maxOutputTokens: 512,
      temperature: 0.3,
    });

    const trimmed = response.text.trim();
    if (!trimmed) return null;
    return trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}...` : trimmed;
  }

  private buildMissingInfoSuggestions(intent: {
    goal: string;
    title?: string | null;
    client?: string | null;
    context?: string | null;
    scope?: string | null;
    kpi?: string | null;
    risks?: string | null;
    deadlineAt?: Date | null;
  }): DraftCoachSuggestion[] {
    const suggestions: DraftCoachSuggestion[] = [];
    for (const field of COACH_REQUIRED_FIELDS) {
      const value = (intent as Record<string, unknown>)[field.field];
      const hasValue =
        typeof value === 'string'
          ? value.trim().length > 0
          : value instanceof Date
            ? true
            : Boolean(value);
      if (!hasValue) {
        suggestions.push({
          kind: 'missing_info',
          title: `Missing ${field.label}`,
          l1Text: field.question,
          evidenceRef: `field:${field.field} empty`,
        });
      }
    }
    return suggestions;
  }

  private buildRiskSuggestions(intent: {
    goal: string;
    context?: string | null;
    scope?: string | null;
    kpi?: string | null;
    risks?: string | null;
    deadlineAt?: Date | null;
  }): DraftCoachSuggestion[] {
    const suggestions: DraftCoachSuggestion[] = [];
    const scopeLength = intent.scope?.trim().length ?? 0;
    const contextLength = intent.context?.trim().length ?? 0;
    const hasRisks = Boolean(intent.risks && intent.risks.trim().length > 0);
    const hasKpi = Boolean(intent.kpi && intent.kpi.trim().length > 0);

    if (!hasRisks && (scopeLength > 120 || contextLength > 120)) {
      suggestions.push({
        kind: 'risk',
        title: 'Risks not documented',
        l1Text: 'Add a short list of key risks and mitigation ideas.',
        evidenceRef: 'field:risks empty',
      });
    }

    if (!hasKpi && intent.goal.trim().length > 0) {
      suggestions.push({
        kind: 'risk',
        title: 'Success metrics missing',
        l1Text: 'Define 1-3 KPIs to measure success.',
        evidenceRef: 'field:kpi empty',
      });
    }

    if (intent.deadlineAt && scopeLength > 120) {
      const daysLeft = Math.floor(
        (intent.deadlineAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft >= 0 && daysLeft < 30) {
        suggestions.push({
          kind: 'risk',
          title: 'Timeline may be aggressive',
          l1Text: 'Confirm whether scope fits the current deadline or adjust milestones.',
          evidenceRef: 'heuristic:deadline_scope',
        });
      }
    }

    return suggestions;
  }

  private dedupeSuggestions(items: DraftCoachSuggestion[]): DraftCoachSuggestion[] {
    const seen = new Set<string>();
    const result: DraftCoachSuggestion[] = [];

    for (const item of items) {
      const title = this.truncateText(item.title, 140);
      const l1Text = item.l1Text ? this.truncateText(item.l1Text, 800) : undefined;
      const signature = `${item.kind}:${(l1Text ?? title).toLowerCase().replace(/\s+/g, ' ')}`;
      if (!signature.trim()) continue;
      if (seen.has(signature)) continue;
      seen.add(signature);
      result.push({
        ...item,
        title,
        l1Text,
      });
      if (result.length >= 20) {
        break;
      }
    }

    return result;
  }

  private buildSuggestionTitle(value: string, fallback: string): string {
    const cleaned = value.replace(/^[^A-Za-z0-9]+/, '').trim();
    if (!cleaned) {
      return fallback;
    }
    return cleaned.length > 100 ? `${cleaned.slice(0, 100)}...` : cleaned;
  }

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
  }

  private async applySuggestionPatch(input: {
    orgId: string;
    intentId: string;
    actorUserId?: string;
    proposedPatch?: DraftCoachSuggestion['proposedPatch'] | null;
  }): Promise<string[]> {
    const patch = input.proposedPatch;
    if (!patch || typeof patch !== 'object' || !patch.fields || typeof patch.fields !== 'object') {
      return [];
    }

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
        client: true,
        language: true,
        deadlineAt: true,
        stage: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const allowedFields = new Set([
      'goal',
      'context',
      'scope',
      'kpi',
      'risks',
      'client',
      'language',
      'deadlineAt',
    ]);
    const updates: Prisma.IntentUncheckedUpdateInput = {};
    const changedFields: string[] = [];

    for (const [field, rawValue] of Object.entries(patch.fields)) {
      if (!allowedFields.has(field)) continue;

      if (field === 'deadlineAt') {
        if (rawValue === null) {
          if (intent.deadlineAt !== null) {
            updates.deadlineAt = null;
            changedFields.push('deadlineAt');
          }
        } else if (typeof rawValue === 'string') {
          const trimmed = rawValue.trim();
          if (!trimmed) continue;
          const parsed = new Date(trimmed);
          if (Number.isNaN(parsed.getTime())) {
            continue;
          }
          const current = intent.deadlineAt ? intent.deadlineAt.getTime() : null;
          if (current !== parsed.getTime()) {
            updates.deadlineAt = parsed;
            changedFields.push('deadlineAt');
          }
        }
        continue;
      }

      if (rawValue !== null && typeof rawValue !== 'string') {
        continue;
      }
      let normalized = rawValue === null ? null : this.normalizeOptionalText(rawValue);
      if (field === 'language' && typeof normalized === 'string') {
        normalized = normalized.toUpperCase();
      }
      if ((field === 'goal' || field === 'language') && !normalized) {
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
      channel: 'ui',
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

import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { IntentStage } from './intent.types';
import { buildIntentShortId, normalizeIntentName } from './intent.utils';

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
      select: { id: true, sourceTextRaw: true },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }
    if (!intent.sourceTextRaw) {
      throw new BadRequestException('Intent has no source text');
    }

    return {
      status: 'not_implemented',
      intentId: intent.id,
    };
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

import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { IntentStage } from './intent.types';

export type CreateIntentInput = {
  orgId: string;
  actorUserId: string;
  goal?: string | null;
  title?: string | null;
  sourceTextRaw?: string | null;
  context?: string | null;
  scope?: string | null;
  kpi?: string | null;
  risks?: string | null;
  deadlineAt?: Date | null;
};

export type ListIntentInput = {
  orgId: string;
  stage?: IntentStage;
  limit?: number;
};

export type RunIntentCoachInput = {
  orgId: string;
  intentId: string;
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

    const rawText = input.sourceTextRaw ?? null;
    const isPaste = Boolean(rawText && rawText.trim().length > 0);
    const title = isPaste ? this.deriveTitle(rawText!, input.title) : input.goal ?? '';
    const goal = isPaste ? title : input.goal ?? '';

    const sourceTextSha256 = isPaste ? this.hashText(rawText!) : null;
    const sourceTextLength = isPaste ? rawText!.length : null;

    const intent = await this.prisma.intent.create({
      data: {
        orgId: input.orgId,
        createdByUserId: input.actorUserId,
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
      },
    });

    const payload: Record<string, unknown> = {
      payloadVersion: 1,
      intentId: intent.id,
      title,
      language: org.defaultLanguage || 'EN',
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
      occurredAt: new Date(),
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
    const take = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    return this.prisma.intent.findMany({
      where: {
        orgId: input.orgId,
        stage: input.stage,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
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
}

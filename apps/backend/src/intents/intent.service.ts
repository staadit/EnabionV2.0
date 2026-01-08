import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { IntentStage } from './intent.types';

export type CreateIntentInput = {
  orgId: string;
  actorUserId: string;
  goal: string;
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

    const intent = await this.prisma.intent.create({
      data: {
        orgId: input.orgId,
        createdByUserId: input.actorUserId,
        goal: input.goal,
        context: input.context ?? null,
        scope: input.scope ?? null,
        kpi: input.kpi ?? null,
        risks: input.risks ?? null,
        deadlineAt: input.deadlineAt ?? null,
        stage: 'NEW',
        confidentialityLevel: 'L1',
        source: 'manual',
      },
    });

    const payload: Record<string, unknown> = {
      payloadVersion: 1,
      intentId: intent.id,
      title: input.goal,
      language: org.defaultLanguage || 'EN',
      confidentialityLevel: 'L1',
      source: 'manual',
      goal: input.goal,
    };

    if (input.context) payload.context = input.context;
    if (input.scope) payload.scope = input.scope;
    if (input.kpi) payload.kpi = input.kpi;
    if (input.risks) payload.risks = input.risks;
    if (input.deadlineAt) payload.deadlineAt = input.deadlineAt.toISOString();

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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma.service';
import { EventService } from '../events/event.service';
import { EVENT_TYPES, type Channel } from '../events/event-registry';
import { IntentStage } from '../intents/intent.types';

type AvatarSuggestionSubject = 'INTENT' | 'USER' | 'ORG';
type AvatarType = 'SYSTEM' | 'ORG_X' | 'INTENT_COACH';
type AvatarSuggestionKind =
  | 'missing_info'
  | 'risk'
  | 'question'
  | 'rewrite'
  | 'summary'
  | 'lead_qualification'
  | 'next_step';

type UpsertSuggestionInput = {
  orgId: string;
  avatarType: AvatarType;
  kind: AvatarSuggestionKind;
  subjectType: AvatarSuggestionSubject;
  subjectId: string;
  intentId?: string | null;
  title: string;
  l1Text?: string | null;
  evidenceRef?: string | null;
  proposedPatch?: Record<string, unknown> | null;
  ctas?: unknown;
  metadata?: unknown;
  language?: string | null;
  actionable?: boolean;
  actorUserId?: string | null;
  channel?: Channel;
  lifecycleStep?: 'CLARIFY' | 'MATCH_ALIGN' | 'COMMIT_ASSURE';
  pipelineStage?: IntentStage;
};

type DecideSuggestionInput = {
  orgId: string;
  suggestionId: string;
  actorUserId?: string | null;
  channel?: Channel;
  reasonCode?: string;
  note?: string | null;
};

@Injectable()
export class AvatarSuggestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
  ) {}

  async upsertSuggestion(input: UpsertSuggestionInput) {
    const existing = await this.prisma.avatarSuggestion.findFirst({
      where: {
        orgId: input.orgId,
        avatarType: input.avatarType,
        kind: input.kind,
        status: 'ISSUED',
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        intentId: input.intentId ?? null,
        title: input.title,
      },
    });

    if (existing) {
      const updated = await this.prisma.avatarSuggestion.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          l1Text: input.l1Text ?? null,
          evidenceRef: input.evidenceRef ?? null,
          proposedPatch: this.toJsonValue(input.proposedPatch),
          ctas: input.ctas ?? undefined,
          metadata: input.metadata ?? undefined,
          language: input.language ?? null,
          actionable: input.actionable ?? existing.actionable,
        },
      });
      return { suggestion: updated, created: false };
    }

    const created = await this.prisma.avatarSuggestion.create({
      data: {
        orgId: input.orgId,
        intentId: input.intentId ?? null,
        avatarType: input.avatarType,
        kind: input.kind,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        title: input.title,
        l1Text: input.l1Text ?? null,
        evidenceRef: input.evidenceRef ?? null,
        proposedPatch: this.toJsonValue(input.proposedPatch),
        ctas: input.ctas ?? undefined,
        metadata: input.metadata ?? undefined,
        language: input.language ?? null,
        actionable: input.actionable ?? true,
      },
    });

    const now = new Date();
    const lifecycleStep = input.lifecycleStep ?? 'CLARIFY';
    const pipelineStage = input.pipelineStage ?? 'NEW';
    const payload = this.buildIssuedPayload(input, created);

    await this.events.emitEvent({
      type: EVENT_TYPES.AVATAR_SUGGESTION_ISSUED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId ?? null,
      actorOrgId: input.orgId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      lifecycleStep,
      pipelineStage,
      channel: input.channel ?? 'ui',
      correlationId: created.id,
      payload,
    });

    return { suggestion: created, created: true };
  }

  async acceptSuggestion(input: DecideSuggestionInput) {
    return this.decideSuggestion({ ...input, decision: 'ACCEPTED' });
  }

  async rejectSuggestion(input: DecideSuggestionInput) {
    return this.decideSuggestion({ ...input, decision: 'REJECTED' });
  }

  private async decideSuggestion(
    input: DecideSuggestionInput & { decision: 'ACCEPTED' | 'REJECTED' },
  ) {
    const suggestion = await this.prisma.avatarSuggestion.findFirst({
      where: { id: input.suggestionId, orgId: input.orgId },
      include: { intent: { select: { stage: true } } },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.status !== 'ISSUED') {
      return { suggestion };
    }

    const now = new Date();
    const metadata = this.mergeDecisionMetadata(suggestion.metadata, input);
    const updated = await this.prisma.avatarSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: input.decision,
        decidedAt: now,
        decidedByUserId: input.actorUserId ?? null,
        metadata,
      },
    });

    const subjectType = this.resolveSubjectType(suggestion);
    const subjectId = this.resolveSubjectId(suggestion, input.actorUserId, input.orgId);
    const pipelineStage = (suggestion.intent?.stage as IntentStage) ?? 'NEW';
    const lifecycleStep = this.mapLifecycleStep(pipelineStage);
    const channel = input.channel ?? 'ui';

    if (input.decision === 'ACCEPTED') {
      await this.events.emitEvent({
        type: EVENT_TYPES.AVATAR_SUGGESTION_ACCEPTED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId ?? null,
        actorOrgId: input.orgId,
        subjectType,
        subjectId,
        lifecycleStep,
        pipelineStage,
        channel,
        correlationId: suggestion.id,
        payload: {
          payloadVersion: 1,
          suggestionId: suggestion.id,
          intentId: suggestion.intentId ?? undefined,
          appliedFields: [],
        },
      });
    } else {
      await this.events.emitEvent({
        type: EVENT_TYPES.AVATAR_SUGGESTION_REJECTED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId ?? null,
        actorOrgId: input.orgId,
        subjectType,
        subjectId,
        lifecycleStep,
        pipelineStage,
        channel,
        correlationId: suggestion.id,
        payload: {
          payloadVersion: 1,
          suggestionId: suggestion.id,
          intentId: suggestion.intentId ?? undefined,
          reasonCode: input.reasonCode,
        },
      });
    }

    return { suggestion: updated };
  }

  private buildIssuedPayload(input: UpsertSuggestionInput, suggestion: { id: string }) {
    const metadata = this.normalizeMetadata(input.metadata);
    return {
      payloadVersion: 1,
      intentId: input.intentId ?? undefined,
      avatarType: input.avatarType,
      suggestionId: suggestion.id,
      suggestionKind: input.kind,
      suggestionL1Text: input.l1Text ?? undefined,
      suggestionRef: input.evidenceRef ?? undefined,
      fitBand: typeof metadata.fitBand === 'string' ? metadata.fitBand : undefined,
      priority: typeof metadata.priority === 'string' ? metadata.priority : undefined,
    };
  }

  private normalizeMetadata(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }
    return metadata as Record<string, unknown>;
  }

  private mergeDecisionMetadata(
    metadata: unknown,
    input: DecideSuggestionInput & { decision: 'ACCEPTED' | 'REJECTED' },
  ) {
    const base = this.normalizeMetadata(metadata);
    const note = typeof input.note === 'string' ? input.note.trim() : '';
    const next: Record<string, unknown> = { ...base, decision: input.decision };
    if (note) {
      next['decisionNote'] = note;
    }
    return next;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    return value as Prisma.InputJsonValue;
  }

  private resolveSubjectType(suggestion: { subjectType: string | null; intentId: string | null }) {
    if (suggestion.subjectType) {
      return suggestion.subjectType as AvatarSuggestionSubject;
    }
    return suggestion.intentId ? 'INTENT' : 'USER';
  }

  private resolveSubjectId(
    suggestion: { subjectId: string | null; intentId: string | null },
    actorUserId?: string | null,
    orgId?: string,
  ) {
    return suggestion.subjectId ?? suggestion.intentId ?? actorUserId ?? orgId ?? ulid();
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
}

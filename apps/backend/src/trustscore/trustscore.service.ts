import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma.service';
import { EVENT_TYPES, validateEvent } from '../events/event-registry';

const ALGORITHM_VERSION = 'trustscore_mvp_v1';
const RESPONSE_SAMPLE_SIZE = 10;
const MISSING_RESPONSE_HOURS = 1000;

type IntentSample = {
  id: string;
  createdAt: Date;
  stage: string | null;
  ownerUserId: string | null;
};

type TrustScoreSignals = {
  profileCompletenessPercent: number | null;
  responseMedianHours: number | null;
  behaviourCompletionRatio: number | null;
  intentCount: number;
  responseSampleCount: number;
  missingResponseCount: number;
};

type TrustScoreResult = {
  scoreOverall: number;
  scoreProfile: number | null;
  scoreResponsiveness: number | null;
  scoreBehaviour: number | null;
  statusLabel: string;
  deltaProfile: number;
  deltaResponse: number;
  deltaBehaviour: number;
  explanationPublic: string[];
  explanationInternal: Record<string, unknown>;
};

export type TrustScoreSnapshotResponse = {
  id: string;
  orgId: string;
  subjectOrgId: string;
  scoreOverall: number;
  scoreProfile: number | null;
  scoreResponsiveness: number | null;
  scoreBehaviour: number | null;
  statusLabel: string;
  explanationPublic: string[];
  algorithmVersion: string;
  computedAt: string;
};

export function computeTrustScore(signals: TrustScoreSignals): TrustScoreResult {
  const deltaProfile = computeProfileDelta(signals.profileCompletenessPercent);
  const deltaResponse = computeResponseDelta(signals.responseMedianHours);
  const deltaBehaviour = computeBehaviourDelta(signals.behaviourCompletionRatio);

  let scoreOverall = clamp(50 + deltaProfile + deltaResponse + deltaBehaviour, 0, 100);
  if (signals.intentCount === 0 && scoreOverall < 50) {
    scoreOverall = 50;
  }
  scoreOverall = Math.round(scoreOverall);

  const scoreProfile =
    signals.profileCompletenessPercent !== null
      ? Math.round(signals.profileCompletenessPercent)
      : null;
  const scoreResponsiveness = mapResponseScore(signals.responseMedianHours);
  const scoreBehaviour =
    signals.behaviourCompletionRatio !== null
      ? Math.round(signals.behaviourCompletionRatio * 100)
      : null;

  const statusLabel =
    signals.intentCount === 0 ? 'New / No history yet' : mapStatusLabel(scoreOverall);

  const explanationPublic = buildPublicExplanation({
    profileCompletenessPercent: signals.profileCompletenessPercent,
    responseMedianHours: signals.responseMedianHours,
    behaviourCompletionRatio: signals.behaviourCompletionRatio,
  });

  const explanationInternal = {
    deltaProfile,
    deltaResponse,
    deltaBehaviour,
    profileCompletenessPercent: signals.profileCompletenessPercent,
    responseMedianHours: signals.responseMedianHours,
    behaviourCompletionRatio: signals.behaviourCompletionRatio,
    intentCount: signals.intentCount,
    responseSampleCount: signals.responseSampleCount,
    missingResponseCount: signals.missingResponseCount,
  };

  return {
    scoreOverall,
    scoreProfile,
    scoreResponsiveness,
    scoreBehaviour,
    statusLabel,
    deltaProfile,
    deltaResponse,
    deltaBehaviour,
    explanationPublic,
    explanationInternal,
  };
}

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestSnapshot(input: {
    orgId: string;
    actorUserId?: string | null;
  }): Promise<TrustScoreSnapshotResponse> {
    const existing = await this.prisma.trustScoreSnapshot.findFirst({
      where: { orgId: input.orgId, subjectOrgId: input.orgId },
      orderBy: { computedAt: 'desc' },
    });
    if (existing) {
      return this.normalizeSnapshot(existing);
    }

    const created = await this.recalculateOrgTrustScore({
      orgId: input.orgId,
      actorUserId: input.actorUserId ?? undefined,
      reason: 'INITIAL',
    });
    return created.snapshot;
  }

  async recalculateOrgTrustScore(input: {
    orgId: string;
    actorUserId?: string | null;
    reason?: string;
    correlationId?: string;
    subjectOrgId?: string;
  }): Promise<{ snapshot: TrustScoreSnapshotResponse }> {
    const subjectOrgId = input.subjectOrgId ?? input.orgId;
    const org = await this.prisma.organization.findUnique({
      where: { id: subjectOrgId },
      select: {
        id: true,
        name: true,
        slug: true,
        providerLanguages: true,
        providerRegions: true,
        providerTags: true,
        providerBudgetBucket: true,
        providerTeamSizeBucket: true,
      },
    });
    if (!org) {
      throw new NotFoundException('Org not found');
    }

    const avatarProfile = await this.prisma.orgAvatarProfile.findUnique({
      where: { orgId: subjectOrgId },
      select: {
        markets: true,
        industries: true,
        clientTypes: true,
        servicePortfolio: true,
        techStack: true,
        excludedSectors: true,
        constraints: true,
      },
    });

    const intents = await this.prisma.intent.findMany({
      where: { orgId: subjectOrgId },
      select: { id: true, createdAt: true, stage: true, ownerUserId: true },
      orderBy: { createdAt: 'desc' },
      take: RESPONSE_SAMPLE_SIZE,
    });

    const profileStats = this.computeProfileStats(org, avatarProfile);
    const responseStats = await this.computeResponseStats(subjectOrgId, intents);
    const behaviourStats = this.computeBehaviourStats(intents);

    const signals: TrustScoreSignals = {
      profileCompletenessPercent: profileStats.percent,
      responseMedianHours: responseStats.medianHours,
      behaviourCompletionRatio: behaviourStats.ratio,
      intentCount: intents.length,
      responseSampleCount: responseStats.sampleCount,
      missingResponseCount: responseStats.missingCount,
    };

    const computed = computeTrustScore(signals);
    const previous = await this.prisma.trustScoreSnapshot.findFirst({
      where: { orgId: input.orgId, subjectOrgId },
      orderBy: { computedAt: 'desc' },
      select: { scoreOverall: true, statusLabel: true },
    });

    const now = new Date();
    const correlationId = input.correlationId ?? ulid();

    const result = await this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.trustScoreSnapshot.create({
        data: {
          orgId: input.orgId,
          subjectOrgId,
          scope: 'GLOBAL',
          scoreOverall: computed.scoreOverall,
          scoreProfile: computed.scoreProfile,
          scoreResponsiveness: computed.scoreResponsiveness,
          scoreBehaviour: computed.scoreBehaviour,
          statusLabel: computed.statusLabel,
          explanationPublic: computed.explanationPublic as Prisma.InputJsonValue,
          explanationInternal: computed.explanationInternal as Prisma.InputJsonValue,
          triggerReason: input.reason ?? null,
          actorUserId: input.actorUserId ?? null,
          algorithmVersion: ALGORITHM_VERSION,
          computedAt: now,
        },
      });

      await tx.organization.update({
        where: { id: subjectOrgId },
        data: { trustScoreLatestId: snapshot.id },
      });

      const event = validateEvent({
        eventId: ulid(),
        type: EVENT_TYPES.TRUSTSCORE_RECALCULATED,
        occurredAt: now,
        orgId: input.orgId,
        actorUserId: input.actorUserId ?? null,
        actorOrgId: input.orgId,
        subjectType: 'TRUSTSCORE_SNAPSHOT',
        subjectId: snapshot.id,
        lifecycleStep: 'CLARIFY',
        pipelineStage: 'NEW',
        channel: 'system',
        correlationId,
        payload: {
          payloadVersion: 1,
          orgId: input.orgId,
          trustScoreSnapshotId: snapshot.id,
          scoreOverall: computed.scoreOverall,
          statusLabel: computed.statusLabel,
          scoreProfile: computed.scoreProfile ?? undefined,
          scoreResponsiveness: computed.scoreResponsiveness ?? undefined,
          scoreBehaviour: computed.scoreBehaviour ?? undefined,
          previousScore: previous?.scoreOverall,
          previousStatusLabel: previous?.statusLabel,
          reason: input.reason ?? undefined,
          algorithmVersion: ALGORITHM_VERSION,
          explanationPublic: computed.explanationPublic,
        },
      });

      await tx.event.create({
        data: {
          id: event.eventId,
          schemaVersion: event.schemaVersion,
          type: event.type,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          orgId: event.orgId,
          actorUserId: event.actorUserId ?? null,
          actorOrgId: event.actorOrgId ?? null,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          lifecycleStep: event.lifecycleStep,
          pipelineStage: event.pipelineStage,
          channel: event.channel,
          correlationId: event.correlationId,
          payload: event.payload as any,
        },
      });

      return snapshot;
    });

    return { snapshot: this.normalizeSnapshot(result) };
  }

  private computeProfileStats(
    org: {
      name: string;
      slug: string;
      providerLanguages: string[] | null;
      providerRegions: string[] | null;
      providerTags: string[] | null;
      providerBudgetBucket: string;
      providerTeamSizeBucket: string;
    },
    avatarProfile: {
      markets: unknown;
      industries: unknown;
      clientTypes: unknown;
      servicePortfolio: unknown;
      techStack: unknown;
      excludedSectors: unknown;
      constraints: unknown;
    } | null,
  ) {
    const checks = [
      { key: 'name', present: Boolean(org.name) },
      { key: 'slug', present: Boolean(org.slug) },
      { key: 'providerLanguages', present: this.hasList(org.providerLanguages) },
      { key: 'providerRegions', present: this.hasList(org.providerRegions) },
      { key: 'providerTags', present: this.hasList(org.providerTags) },
      { key: 'providerBudgetBucket', present: org.providerBudgetBucket !== 'UNKNOWN' },
      { key: 'providerTeamSizeBucket', present: org.providerTeamSizeBucket !== 'UNKNOWN' },
      { key: 'avatar.markets', present: this.hasList(avatarProfile?.markets) },
      { key: 'avatar.industries', present: this.hasList(avatarProfile?.industries) },
      { key: 'avatar.clientTypes', present: this.hasList(avatarProfile?.clientTypes) },
      { key: 'avatar.servicePortfolio', present: this.hasList(avatarProfile?.servicePortfolio) },
      { key: 'avatar.techStack', present: this.hasList(avatarProfile?.techStack) },
      { key: 'avatar.excludedSectors', present: this.hasList(avatarProfile?.excludedSectors) },
      { key: 'avatar.constraints', present: Boolean(avatarProfile?.constraints) },
    ];

    const total = checks.length;
    const completed = checks.filter((item) => item.present).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { percent, completed, total };
  }

  private async computeResponseStats(orgId: string, intents: IntentSample[]) {
    const intentIds = intents.map((intent) => intent.id);
    if (intentIds.length === 0) {
      return { medianHours: null, sampleCount: 0, missingCount: 0 };
    }

    const responseEvents = await this.prisma.event.findMany({
      where: {
        orgId,
        subjectId: { in: intentIds },
        type: { in: ['INTENT_UPDATED', 'INTENT_PIPELINE_STAGE_CHANGED'] },
      },
      orderBy: { occurredAt: 'asc' },
      select: { subjectId: true, occurredAt: true },
    });

    const firstResponseByIntent = new Map<string, Date>();
    responseEvents.forEach((event) => {
      if (!firstResponseByIntent.has(event.subjectId)) {
        firstResponseByIntent.set(event.subjectId, event.occurredAt);
      }
    });

    let missingCount = 0;
    const responseHours = intents.map((intent) => {
      const firstResponse = firstResponseByIntent.get(intent.id);
      if (!firstResponse) {
        missingCount += 1;
        return MISSING_RESPONSE_HOURS;
      }
      const diffMs = Math.max(0, firstResponse.getTime() - intent.createdAt.getTime());
      return diffMs / (1000 * 60 * 60);
    });

    const medianHours = median(responseHours);
    return { medianHours, sampleCount: intents.length, missingCount };
  }

  private computeBehaviourStats(intents: IntentSample[]) {
    if (intents.length === 0) {
      return { ratio: null, completed: 0, total: 0 };
    }
    const completed = intents.filter(
      (intent) =>
        Boolean(intent.ownerUserId) && (intent.stage === 'WON' || intent.stage === 'LOST'),
    ).length;
    return { ratio: completed / intents.length, completed, total: intents.length };
  }

  private normalizeSnapshot(snapshot: {
    id: string;
    orgId: string;
    subjectOrgId: string;
    scoreOverall: number;
    scoreProfile: number | null;
    scoreResponsiveness: number | null;
    scoreBehaviour: number | null;
    statusLabel: string;
    explanationPublic: unknown;
    algorithmVersion: string;
    computedAt: Date;
  }): TrustScoreSnapshotResponse {
    const explanationPublic = Array.isArray(snapshot.explanationPublic)
      ? (snapshot.explanationPublic as string[])
      : [];
    return {
      id: snapshot.id,
      orgId: snapshot.orgId,
      subjectOrgId: snapshot.subjectOrgId,
      scoreOverall: snapshot.scoreOverall,
      scoreProfile: snapshot.scoreProfile ?? null,
      scoreResponsiveness: snapshot.scoreResponsiveness ?? null,
      scoreBehaviour: snapshot.scoreBehaviour ?? null,
      statusLabel: snapshot.statusLabel,
      explanationPublic,
      algorithmVersion: snapshot.algorithmVersion,
      computedAt: snapshot.computedAt.toISOString(),
    };
  }

  private hasList(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0;
  }
}

function buildPublicExplanation(input: {
  profileCompletenessPercent: number | null;
  responseMedianHours: number | null;
  behaviourCompletionRatio: number | null;
}): string[] {
  const items: string[] = [];
  if (input.profileCompletenessPercent !== null) {
    items.push(`Profile ${Math.round(input.profileCompletenessPercent)}% complete`);
  } else {
    items.push('Profile completeness unavailable');
  }

  if (input.responseMedianHours !== null) {
    items.push(`Median response time: ${formatHours(input.responseMedianHours)}h`);
  } else {
    items.push('No response data yet');
  }

  if (input.behaviourCompletionRatio !== null) {
    items.push(
      `Pipeline hygiene: ${Math.round(input.behaviourCompletionRatio * 100)}% intents with owner + final status`,
    );
  } else {
    items.push('No pipeline history yet');
  }

  return items.slice(0, 3);
}

function computeProfileDelta(percent: number | null): number {
  if (percent === null) return 0;
  if (percent < 40) return -5;
  if (percent < 60) return 0;
  if (percent < 80) return 5;
  return 10;
}

function computeResponseDelta(hours: number | null): number {
  if (hours === null) return 0;
  if (hours <= 4) return 10;
  if (hours <= 24) return 5;
  if (hours <= 72) return 0;
  if (hours <= 168) return -5;
  return -10;
}

function computeBehaviourDelta(ratio: number | null): number {
  if (ratio === null) return 0;
  if (ratio > 0.8) return 5;
  if (ratio >= 0.5) return 0;
  return -5;
}

function mapResponseScore(hours: number | null): number | null {
  if (hours === null) return null;
  if (hours <= 4) return 100;
  if (hours <= 24) return 80;
  if (hours <= 72) return 60;
  if (hours <= 168) return 40;
  return 20;
}

function mapStatusLabel(score: number): string {
  if (score < 40) return 'Low trust / problematic history';
  if (score < 60) return 'Neutral / standard';
  if (score < 80) return 'Good behaviour';
  return 'Excellent / strong reputation';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1000) return '168+';
  return value.toFixed(1);
}

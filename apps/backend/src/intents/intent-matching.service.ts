import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { TrustScoreService } from '../trustscore/trustscore.service';

const ALGORITHM_VERSION = 'rule-v1';
const WEIGHTS = {
  language: 30,
  tech: 25,
  industry: 20,
  region: 15,
  budget: 10,
} as const;

type MatchFactor = keyof typeof WEIGHTS;

type MatchFeedbackAction = 'SHORTLIST' | 'HIDE' | 'NOT_RELEVANT';
type MatchFeedbackStatus = 'NEUTRAL' | 'SHORTLISTED' | 'HIDDEN' | 'NOT_RELEVANT';

type FactorBreakdown = {
  weight: number;
  normalizedScore: number;
  contribution: number;
  matched: string[];
  compared: { intent: string[]; org: string[] };
  notes: string;
};

type TrustScoreSummary = {
  scoreOverall: number;
  statusLabel: string;
  computedAt: string;
};

export type MatchCandidate = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  totalScore: number;
  breakdown: Record<MatchFactor, FactorBreakdown>;
  trustScore?: TrustScoreSummary;
  feedbackStatus?: MatchFeedbackStatus;
};

export type MatchListResult = {
  matchListId: string;
  intentId: string;
  algorithmVersion: string;
  generatedAt: string;
  candidates: MatchCandidate[];
};

@Injectable()
export class IntentMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async runMatching(input: { orgId: string; intentId: string; actorUserId: string }) {
    const intent = await this.getIntentForMatching(input.orgId, input.intentId);
    const candidates = await this.fetchCandidateOrgs(input.orgId);
    const trustScoresByOrgId = await this.fetchTrustScoreMap(candidates);
    const results = this.scoreCandidates(intent, candidates, trustScoresByOrgId);
    const now = new Date();

    const matchList = await this.prisma.matchList.create({
      data: {
        orgId: input.orgId,
        intentId: intent.id,
        algorithmVersion: ALGORITHM_VERSION,
        createdByUserId: input.actorUserId,
        createdAt: now,
        resultsJson: {
          intentId: intent.id,
          algorithmVersion: ALGORITHM_VERSION,
          generatedAt: now.toISOString(),
          candidates: results,
        },
      },
      select: {
        id: true,
        intentId: true,
        algorithmVersion: true,
        createdAt: true,
        resultsJson: true,
      },
    });

    const topCandidates = results.slice(0, 5).map((candidate) => candidate.orgId);
    await this.events.emitEvent({
      type: EVENT_TYPES.MATCH_LIST_CREATED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: intent.id,
      lifecycleStep: 'MATCH_ALIGN',
      pipelineStage: 'MATCH',
      channel: 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: intent.id,
        matchListId: matchList.id,
        algorithmVersion: ALGORITHM_VERSION,
        topCandidates,
      },
    });

    await this.trustScore.recalculateOrgTrustScore({
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      reason: 'MATCH_LIST_CREATED',
    });

    return this.buildMatchListResponse(matchList);
  }

  async getLatestMatchList(input: { orgId: string; intentId: string }) {
    await this.getIntentForMatching(input.orgId, input.intentId);
    const matchList = await this.prisma.matchList.findFirst({
      where: { orgId: input.orgId, intentId: input.intentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        intentId: true,
        algorithmVersion: true,
        createdAt: true,
        resultsJson: true,
      },
    });

    if (!matchList) {
      return null;
    }

    const results = this.parseResults(matchList.resultsJson);
    const candidates = Array.isArray(results.candidates) ? (results.candidates as MatchCandidate[]) : [];
    const feedbackStatusByOrg = await this.fetchFeedbackStatusMap({
      orgId: input.orgId,
      intentId: input.intentId,
      candidateOrgIds: candidates.map((candidate) => candidate.orgId),
    });

    return this.buildMatchListResponse(matchList, results, feedbackStatusByOrg);
  }

  async recordFeedback(input: {
    orgId: string;
    intentId: string;
    matchListId: string;
    candidateOrgId: string;
    action: MatchFeedbackAction;
    notes?: string | null;
    actorUserId: string;
  }) {
    await this.getIntentForMatching(input.orgId, input.intentId);

    const matchList = await this.prisma.matchList.findFirst({
      where: { id: input.matchListId, orgId: input.orgId, intentId: input.intentId },
      select: { id: true, resultsJson: true },
    });
    if (!matchList) {
      throw new NotFoundException('Match list not found');
    }

    const notes = this.normalizeNotes(input.notes);
    const rating = this.mapActionToRating(input.action);
    const now = new Date();

    const feedback = await this.prisma.matchFeedback.create({
      data: {
        orgId: input.orgId,
        intentId: input.intentId,
        matchListId: input.matchListId,
        candidateOrgId: input.candidateOrgId,
        actorUserId: input.actorUserId,
        action: input.action,
        rating,
        notes,
        createdAt: now,
      },
      select: { id: true },
    });

    const candidateMeta = this.findCandidateMeta(matchList.resultsJson, input.candidateOrgId);

    await this.events.emitEvent({
      type: EVENT_TYPES.MATCH_FEEDBACK_RECORDED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: 'INTENT',
      subjectId: input.intentId,
      lifecycleStep: 'MATCH_ALIGN',
      pipelineStage: 'MATCH',
      channel: 'ui',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        intentId: input.intentId,
        matchListId: input.matchListId,
        candidateOrgId: input.candidateOrgId,
        action: input.action,
        rating: rating.toLowerCase() as 'up' | 'down',
        ...(candidateMeta?.name ? { candidateOrgName: candidateMeta.name } : {}),
        ...(candidateMeta?.slug ? { candidateOrgSlug: candidateMeta.slug } : {}),
        ...(notes ? { notes } : {}),
      },
    });

    return { feedbackId: feedback.id };
  }

  private async getIntentForMatching(orgId: string, intentId: string) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: intentId, orgId },
      select: {
        id: true,
        orgId: true,
        confidentialityLevel: true,
        language: true,
        tech: true,
        industry: true,
        region: true,
        budgetBucket: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }
    if (intent.confidentialityLevel !== 'L1') {
      throw new ForbiddenException('Matching available only for L1 intents');
    }
    return intent;
  }

  private async fetchCandidateOrgs(orgId: string) {
    return this.prisma.organization.findMany({
      where: { status: 'ACTIVE', id: { not: orgId } },
      select: {
        id: true,
        name: true,
        slug: true,
        providerLanguages: true,
        providerRegions: true,
        providerTags: true,
        providerBudgetBucket: true,
        trustScoreLatestId: true,
      },
    });
  }

  private scoreCandidates(
    intent: {
      id: string;
      language: string;
      tech: string[];
      industry: string[];
      region: string[];
      budgetBucket: string;
    },
    orgs: Array<{
      id: string;
      name: string;
      slug: string;
      providerLanguages: string[];
      providerRegions: string[];
      providerTags: string[];
      providerBudgetBucket: string;
      trustScoreLatestId?: string | null;
    }>,
    trustScoresByOrgId: Record<string, TrustScoreSummary>,
  ): MatchCandidate[] {
    const intentLanguage = this.normalizeScalar(intent.language);
    const intentTech = this.normalizeList(intent.tech);
    const intentIndustry = this.normalizeList(intent.industry);
    const intentRegion = this.normalizeList(intent.region, true);
    const intentBudget = this.normalizeScalar(intent.budgetBucket);

    const candidates = orgs
      .filter((org) => this.hasProfileSignal(org))
      .map((org) => {
        const orgLanguages = this.normalizeList(org.providerLanguages, true);
        const orgRegions = this.normalizeList(org.providerRegions, true);
        const orgTags = this.normalizeList(org.providerTags);
        const orgBudget = this.normalizeScalar(org.providerBudgetBucket);

        const languageMatched = intentLanguage
          ? orgLanguages.includes(intentLanguage)
          : false;
        const languageScore = languageMatched ? 1 : 0;
        const languageBreakdown = this.buildBreakdown({
          factor: 'language',
          intentValues: intentLanguage ? [intentLanguage] : [],
          orgValues: orgLanguages,
          matched: languageMatched ? [intentLanguage] : [],
          normalizedScore: languageScore,
          notes: languageMatched
            ? 'Intent language matched provider languages.'
            : 'Intent language not in provider languages.',
        });

        const techOverlap = this.computeOverlap(intentTech, orgTags);
        const techScore = this.normalizeRatio(techOverlap.matched.length, intentTech.length);
        const techBreakdown = this.buildBreakdown({
          factor: 'tech',
          intentValues: intentTech,
          orgValues: orgTags,
          matched: techOverlap.matched,
          normalizedScore: techScore,
          notes: techOverlap.matched.length
            ? `Matched ${techOverlap.matched.length}/${Math.max(1, intentTech.length)} tech tags.`
            : 'No tech overlap.',
        });

        const industryOverlap = this.computeOverlap(intentIndustry, orgTags);
        const industryScore = this.normalizeRatio(
          industryOverlap.matched.length,
          intentIndustry.length,
        );
        const industryBreakdown = this.buildBreakdown({
          factor: 'industry',
          intentValues: intentIndustry,
          orgValues: orgTags,
          matched: industryOverlap.matched,
          normalizedScore: industryScore,
          notes: industryOverlap.matched.length
            ? `Matched ${industryOverlap.matched.length}/${Math.max(1, intentIndustry.length)} industries.`
            : 'No industry overlap.',
        });

        const regionOverlap = this.computeOverlap(intentRegion, orgRegions);
        const regionScore = regionOverlap.matched.length > 0 ? 1 : 0;
        const regionBreakdown = this.buildBreakdown({
          factor: 'region',
          intentValues: intentRegion,
          orgValues: orgRegions,
          matched: regionOverlap.matched,
          normalizedScore: regionScore,
          notes: regionOverlap.matched.length
            ? 'Region overlap detected.'
            : 'No region overlap.',
        });

        const budgetMatched =
          intentBudget &&
          orgBudget &&
          intentBudget !== 'UNKNOWN' &&
          orgBudget !== 'UNKNOWN' &&
          intentBudget === orgBudget;
        const budgetScore = budgetMatched ? 1 : 0;
        const budgetBreakdown = this.buildBreakdown({
          factor: 'budget',
          intentValues: intentBudget ? [intentBudget] : [],
          orgValues: orgBudget ? [orgBudget] : [],
          matched: budgetMatched ? [intentBudget] : [],
          normalizedScore: budgetScore,
          notes: budgetMatched ? 'Budget bucket matched.' : 'Budget bucket did not match.',
        });

        const breakdown: Record<MatchFactor, FactorBreakdown> = {
          language: languageBreakdown,
          tech: techBreakdown,
          industry: industryBreakdown,
          region: regionBreakdown,
          budget: budgetBreakdown,
        };
        const totalScore = this.round2(
          breakdown.language.contribution +
            breakdown.tech.contribution +
            breakdown.industry.contribution +
            breakdown.region.contribution +
            breakdown.budget.contribution,
        );

        return {
          orgId: org.id,
          orgName: org.name,
          orgSlug: org.slug,
          totalScore,
          breakdown,
          trustScore: trustScoresByOrgId[org.id],
        };
      });

    candidates.sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }
      const nameCompare = left.orgName.localeCompare(right.orgName, 'en', {
        sensitivity: 'base',
      });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return left.orgId.localeCompare(right.orgId);
    });

    return candidates;
  }

  private async fetchTrustScoreMap(
    orgs: Array<{ id: string; trustScoreLatestId?: string | null }>,
  ): Promise<Record<string, TrustScoreSummary>> {
    const latestIds = orgs
      .map((org) => org.trustScoreLatestId)
      .filter((id): id is string => Boolean(id));
    if (latestIds.length === 0) {
      return {};
    }

    const snapshots = await this.prisma.trustScoreSnapshot.findMany({
      where: { id: { in: latestIds } },
      select: {
        id: true,
        scoreOverall: true,
        statusLabel: true,
        computedAt: true,
      },
    });

    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const output: Record<string, TrustScoreSummary> = {};
    orgs.forEach((org) => {
      if (!org.trustScoreLatestId) {
        return;
      }
      const snapshot = snapshotById.get(org.trustScoreLatestId);
      if (!snapshot) {
        return;
      }
      output[org.id] = {
        scoreOverall: snapshot.scoreOverall,
        statusLabel: snapshot.statusLabel,
        computedAt: snapshot.computedAt.toISOString(),
      };
    });
    return output;
  }

  private buildMatchListResponse(matchList: {
    id: string;
    intentId: string;
    algorithmVersion: string;
    createdAt: Date;
    resultsJson: unknown;
  }, resultsOverride?: Record<string, unknown>, feedbackStatusByOrg?: Record<string, MatchFeedbackStatus>): MatchListResult {
    const results = resultsOverride ?? this.parseResults(matchList.resultsJson);
    const candidates = Array.isArray(results.candidates)
      ? (results.candidates as MatchCandidate[])
      : [];
    const generatedAt =
      typeof results.generatedAt === 'string' ? results.generatedAt : matchList.createdAt.toISOString();
    const algorithmVersion =
      typeof results.algorithmVersion === 'string' ? results.algorithmVersion : matchList.algorithmVersion;

    const candidatesWithStatus = candidates.map((candidate) => ({
      ...candidate,
      feedbackStatus: this.resolveFeedbackStatus(candidate, feedbackStatusByOrg),
    }));

    return {
      matchListId: matchList.id,
      intentId: matchList.intentId,
      algorithmVersion,
      generatedAt,
      candidates: candidatesWithStatus,
    };
  }

  private buildBreakdown(input: {
    factor: MatchFactor;
    intentValues: string[];
    orgValues: string[];
    matched: string[];
    normalizedScore: number;
    notes: string;
  }): FactorBreakdown {
    const weight = WEIGHTS[input.factor];
    return {
      weight,
      normalizedScore: this.round2(input.normalizedScore),
      contribution: this.round2(weight * input.normalizedScore),
      matched: input.matched,
      compared: { intent: input.intentValues, org: input.orgValues },
      notes: input.notes,
    };
  }

  private normalizeList(values: string[] | null | undefined, upper = false): string[] {
    if (!Array.isArray(values)) return [];
    const mapped = values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .map((value) => (upper ? value.toUpperCase() : value.toLowerCase()));
    return Array.from(new Set(mapped));
  }

  private normalizeScalar(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim().toUpperCase();
  }

  private computeOverlap(left: string[], right: string[]): { matched: string[] } {
    const rightSet = new Set(right);
    const matched = left.filter((value) => rightSet.has(value));
    return { matched: Array.from(new Set(matched)).sort() };
  }

  private normalizeRatio(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      return 0;
    }
    return Math.min(1, numerator / Math.max(1, denominator));
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private hasProfileSignal(org: {
    providerLanguages: string[];
    providerRegions: string[];
    providerTags: string[];
    providerBudgetBucket: string;
  }): boolean {
    if (org.providerLanguages?.length) return true;
    if (org.providerRegions?.length) return true;
    if (org.providerTags?.length) return true;
    if (org.providerBudgetBucket && org.providerBudgetBucket !== 'UNKNOWN') return true;
    return false;
  }

  private normalizeNotes(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > 280 ? `${trimmed.slice(0, 280)}` : trimmed;
  }

  private parseResults(resultsJson: unknown): Record<string, unknown> {
    if (typeof resultsJson === 'object' && resultsJson !== null) {
      return resultsJson as Record<string, unknown>;
    }
    return {};
  }

  private mapActionToRating(action: MatchFeedbackAction): 'UP' | 'DOWN' {
    return action === 'SHORTLIST' ? 'UP' : 'DOWN';
  }

  private resolveFeedbackStatus(
    candidate: MatchCandidate,
    feedbackStatusByOrg?: Record<string, MatchFeedbackStatus>,
  ): MatchFeedbackStatus {
    const fromMap = feedbackStatusByOrg?.[candidate.orgId];
    if (fromMap) {
      return fromMap;
    }
    const raw = (candidate.feedbackStatus ?? '').toUpperCase();
    if (raw === 'SHORTLISTED') return 'SHORTLISTED';
    if (raw === 'HIDDEN') return 'HIDDEN';
    if (raw === 'NOT_RELEVANT') return 'NOT_RELEVANT';
    return 'NEUTRAL';
  }

  private async fetchFeedbackStatusMap(input: {
    orgId: string;
    intentId: string;
    candidateOrgIds: string[];
  }): Promise<Record<string, MatchFeedbackStatus>> {
    if (!input.candidateOrgIds.length) {
      return {};
    }
    const feedbackRows = await this.prisma.matchFeedback.findMany({
      where: {
        orgId: input.orgId,
        intentId: input.intentId,
        candidateOrgId: { in: input.candidateOrgIds },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        candidateOrgId: true,
        action: true,
        rating: true,
      },
    });

    const statusByOrg: Record<string, MatchFeedbackStatus> = {};
    for (const row of feedbackRows) {
      if (statusByOrg[row.candidateOrgId]) {
        continue;
      }
      statusByOrg[row.candidateOrgId] = this.mapFeedbackToStatus(
        row.action ?? null,
        row.rating ?? null,
      );
    }
    return statusByOrg;
  }

  private mapFeedbackToStatus(
    action: MatchFeedbackAction | null,
    rating: 'UP' | 'DOWN' | null,
  ): MatchFeedbackStatus {
    if (action === 'SHORTLIST') return 'SHORTLISTED';
    if (action === 'HIDE') return 'HIDDEN';
    if (action === 'NOT_RELEVANT') return 'NOT_RELEVANT';
    if (rating === 'UP') return 'SHORTLISTED';
    if (rating === 'DOWN') return 'NOT_RELEVANT';
    return 'NEUTRAL';
  }

  private findCandidateMeta(
    resultsJson: unknown,
    candidateOrgId: string,
  ): { name?: string; slug?: string } | null {
    const results = this.parseResults(resultsJson);
    const candidates = Array.isArray(results.candidates) ? results.candidates : [];
    const match = candidates.find((candidate) => {
      if (!candidate || typeof candidate !== 'object') {
        return false;
      }
      const orgId = (candidate as { orgId?: string }).orgId;
      return orgId === candidateOrgId;
    }) as { orgName?: string; orgSlug?: string } | undefined;

    if (!match) {
      return null;
    }
    return {
      name: match.orgName,
      slug: match.orgSlug,
    };
  }
}

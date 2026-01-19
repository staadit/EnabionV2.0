import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NdaService } from '../nda/nda.service';
import { AvatarSuggestionService } from './avatar-suggestion.service';
import { IntentStage } from '../intents/intent.types';

const SYSTEM_ONBOARDING_VERSION = 'R1.0';
const SYSTEM_ONBOARDING_STEPS = ['how_it_works', 'nda', 'first_intent', 'use_avatars'] as const;

type OnboardingAction = 'complete' | 'skip';

type OnboardingState = {
  id: string;
  orgId: string;
  userId: string;
  version: string;
  currentStep: string | null;
  completedSteps: string[];
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

@Injectable()
export class SystemAvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nda: NdaService,
    private readonly suggestions: AvatarSuggestionService,
  ) {}

  async getOnboardingState(orgId: string, userId: string): Promise<OnboardingState> {
    const existing = await this.prisma.userOnboardingState.findUnique({
      where: {
        orgId_userId_version: {
          orgId,
          userId,
          version: SYSTEM_ONBOARDING_VERSION,
        },
      },
    });
    if (existing) {
      return this.normalizeState(existing);
    }

    const created = await this.prisma.userOnboardingState.create({
      data: {
        orgId,
        userId,
        version: SYSTEM_ONBOARDING_VERSION,
        currentStep: SYSTEM_ONBOARDING_STEPS[0],
        completedSteps: [],
      },
    });
    return this.normalizeState(created);
  }

  async updateOnboardingState(
    orgId: string,
    userId: string,
    stepId: string,
    action: OnboardingAction,
  ): Promise<OnboardingState> {
    if (!SYSTEM_ONBOARDING_STEPS.includes(stepId as (typeof SYSTEM_ONBOARDING_STEPS)[number])) {
      throw new BadRequestException('Unknown onboarding step');
    }

    const state = await this.getOnboardingState(orgId, userId);
    const completed = new Set(state.completedSteps);
    if (action === 'complete' || action === 'skip') {
      completed.add(stepId);
    }

    const completedSteps = Array.from(completed);
    const isComplete = SYSTEM_ONBOARDING_STEPS.every((step) => completed.has(step));

    const updated = await this.prisma.userOnboardingState.update({
      where: { id: state.id },
      data: {
        currentStep: stepId,
        completedSteps,
        completedAt: isComplete ? state.completedAt ?? new Date() : null,
      },
    });

    return this.normalizeState(updated);
  }

  async getDashboard(input: { orgId: string; userId: string; intentId?: string | null }) {
    const org = await this.prisma.organization.findUnique({
      where: { id: input.orgId },
      select: { defaultLanguage: true },
    });
    if (!org) {
      throw new NotFoundException('Org not found');
    }

    const pipelineSummary = await this.buildPipelineSummary(input.orgId);
    const ndaAccepted = await this.nda.hasAccepted({ orgId: input.orgId });
    const suggestions = [];

    if (pipelineSummary.total === 0) {
      const suggestion = await this.suggestions.upsertSuggestion({
        orgId: input.orgId,
        avatarType: 'SYSTEM',
        kind: 'next_step',
        subjectType: 'USER',
        subjectId: input.userId,
        title: 'Create your first Intent',
        l1Text: 'Start with a first Intent to enter the Clarify flow.',
        ctas: [{ id: 'create_intent', type: 'create_intent' }],
        metadata: { action: 'create_intent' },
        language: org.defaultLanguage ?? 'EN',
        actorUserId: input.userId,
        channel: 'ui',
      });
      suggestions.push(suggestion.suggestion);
    }

    let selectedIntentGovernance: null | {
      intentId: string;
      stage: IntentStage;
      missingFields: string[];
      ndaAccepted: boolean;
    } = null;

    if (input.intentId) {
      const intent = await this.prisma.intent.findFirst({
        where: { id: input.intentId, orgId: input.orgId },
        select: {
          id: true,
          goal: true,
          title: true,
          client: true,
          context: true,
          scope: true,
          kpi: true,
          risks: true,
          deadlineAt: true,
          stage: true,
          language: true,
        },
      });
      if (!intent) {
        throw new NotFoundException('Intent not found');
      }

      const missingFields = this.findMissingFields(intent);
      selectedIntentGovernance = {
        intentId: intent.id,
        stage: intent.stage as IntentStage,
        missingFields,
        ndaAccepted,
      };

      if (missingFields.length > 0) {
        const suggestion = await this.suggestions.upsertSuggestion({
          orgId: input.orgId,
          avatarType: 'SYSTEM',
          kind: 'missing_info',
          subjectType: 'INTENT',
          subjectId: intent.id,
          intentId: intent.id,
          title: 'Complete missing Intent fields',
          l1Text: 'Add the missing details to improve BCOS readiness.',
          ctas: [{ id: 'open_intent', type: 'open_intent', targetId: intent.id }],
          metadata: { missingFields },
          language: intent.language ?? org.defaultLanguage ?? 'EN',
          actorUserId: input.userId,
          channel: 'ui',
          lifecycleStep: this.mapLifecycleStep(intent.stage as IntentStage),
          pipelineStage: intent.stage as IntentStage,
        });
        suggestions.push(suggestion.suggestion);
      }

      const coachSuggestion = await this.suggestions.upsertSuggestion({
        orgId: input.orgId,
        avatarType: 'SYSTEM',
        kind: 'next_step',
        subjectType: 'INTENT',
        subjectId: intent.id,
        intentId: intent.id,
        title: 'Run Intent Coach',
        l1Text: 'Let Intent Coach suggest clarifying questions and gaps.',
        ctas: [{ id: 'open_intent_coach', type: 'open_intent_coach', targetId: intent.id }],
        metadata: { action: 'open_intent_coach' },
        language: intent.language ?? org.defaultLanguage ?? 'EN',
        actorUserId: input.userId,
        channel: 'ui',
        lifecycleStep: this.mapLifecycleStep(intent.stage as IntentStage),
        pipelineStage: intent.stage as IntentStage,
      });
      suggestions.push(coachSuggestion.suggestion);
    }

    if (!ndaAccepted) {
      const suggestion = await this.suggestions.upsertSuggestion({
        orgId: input.orgId,
        avatarType: 'SYSTEM',
        kind: 'next_step',
        subjectType: 'ORG',
        subjectId: input.orgId,
        title: 'Sign Mutual NDA',
        l1Text: 'Complete Mutual NDA to enable Level 2 collaboration.',
        ctas: [{ id: 'open_nda_settings', type: 'open_nda_settings' }],
        metadata: { action: 'open_nda_settings' },
        language: org.defaultLanguage ?? 'EN',
        actorUserId: input.userId,
        channel: 'ui',
      });
      suggestions.push(suggestion.suggestion);
    }

    return {
      pipelineSummary,
      selectedIntentGovernance,
      suggestions: suggestions.map((item) => this.toSuggestionResponse(item)),
    };
  }

  private normalizeState(state: any): OnboardingState {
    return {
      ...state,
      currentStep: state.currentStep ?? null,
      completedSteps: Array.isArray(state.completedSteps) ? state.completedSteps : [],
    };
  }

  private findMissingFields(intent: {
    goal: string;
    title: string | null;
    client: string | null;
    context: string | null;
    scope: string | null;
    kpi: string | null;
    risks: string | null;
    deadlineAt: Date | null;
  }) {
    const missing: string[] = [];
    if (!intent.goal?.trim()) missing.push('goal');
    if (!intent.client?.trim()) missing.push('client');
    if (!intent.context?.trim()) missing.push('context');
    if (!intent.scope?.trim()) missing.push('scope');
    if (!intent.kpi?.trim()) missing.push('kpi');
    if (!intent.risks?.trim()) missing.push('risks');
    if (!intent.deadlineAt) missing.push('deadlineAt');
    return missing;
  }

  private async buildPipelineSummary(orgId: string) {
    const rows = await this.prisma.intent.groupBy({
      by: ['stage'],
      where: { orgId },
      _count: { _all: true },
    });

    const byStage: Record<IntentStage, number> = {
      NEW: 0,
      CLARIFY: 0,
      MATCH: 0,
      COMMIT: 0,
      WON: 0,
      LOST: 0,
    };

    rows.forEach((row) => {
      const stage = row.stage as IntentStage;
      if (byStage[stage] !== undefined) {
        byStage[stage] = row._count._all;
      }
    });

    const total = Object.values(byStage).reduce((sum, value) => sum + value, 0);
    return { total, byStage };
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

  private toSuggestionResponse(suggestion: any) {
    return {
      id: suggestion.id,
      avatarType: suggestion.avatarType,
      kind: suggestion.kind,
      subjectType: suggestion.subjectType,
      subjectId: suggestion.subjectId,
      intentId: suggestion.intentId,
      title: suggestion.title,
      body: suggestion.l1Text,
      status: suggestion.status,
      ctas: suggestion.ctas ?? [],
      metadata: suggestion.metadata ?? {},
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AvatarSuggestionService } from './avatar-suggestion.service';
import { IntentStage } from '../intents/intent.types';

const ORG_PROFILE_VERSION = 'R1.0';

type OrgAvatarProfilePayload = {
  id?: string;
  orgId: string;
  profileVersion: string;
  markets: string[];
  industries: string[];
  clientTypes: string[];
  servicePortfolio: string[];
  techStack: string[];
  excludedSectors: string[];
  constraints: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

type QualificationResult = {
  fitBand: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_FIT';
  priority: 'P1' | 'P2' | 'P3';
  reasons: string[];
  matches: Record<string, string[]>;
};

@Injectable()
export class OrgAvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suggestions: AvatarSuggestionService,
  ) {}

  async getProfile(orgId: string): Promise<OrgAvatarProfilePayload> {
    const profile = await this.prisma.orgAvatarProfile.findUnique({
      where: { orgId },
    });
    if (!profile) {
      return this.buildDefaultProfile(orgId);
    }
    return this.normalizeProfile(profile);
  }

  async updateProfile(input: {
    orgId: string;
    actorUserId: string;
    profile: Partial<OrgAvatarProfilePayload>;
  }) {
    const normalized = {
      markets: this.normalizeTagList(input.profile.markets),
      industries: this.normalizeTagList(input.profile.industries),
      clientTypes: this.normalizeTagList(input.profile.clientTypes),
      servicePortfolio: this.normalizeTagList(input.profile.servicePortfolio),
      techStack: this.normalizeTagList(input.profile.techStack),
      excludedSectors: this.normalizeTagList(input.profile.excludedSectors),
      constraints: this.normalizeConstraints(input.profile.constraints) as Prisma.InputJsonValue,
    };

    const updated = await this.prisma.orgAvatarProfile.upsert({
      where: { orgId: input.orgId },
      update: {
        ...normalized,
        profileVersion: ORG_PROFILE_VERSION,
        updatedByUserId: input.actorUserId,
      },
      create: {
        orgId: input.orgId,
        profileVersion: ORG_PROFILE_VERSION,
        ...normalized,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    return this.normalizeProfile(updated);
  }

  async qualifyIntent(input: {
    orgId: string;
    actorUserId: string;
    intentId: string;
    channel?: 'ui' | 'api';
  }) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: {
        id: true,
        intentName: true,
        goal: true,
        title: true,
        client: true,
        context: true,
        scope: true,
        language: true,
        stage: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const profile = await this.getProfile(input.orgId);
    const qualification = this.scoreIntent(intent, profile);

    const existingSuggestion = await this.prisma.avatarSuggestion.findFirst({
      where: {
        orgId: input.orgId,
        avatarType: 'ORG_X',
        kind: 'lead_qualification',
        subjectType: 'INTENT',
        subjectId: intent.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    const reuseSuggestion =
      existingSuggestion && this.matchesQualification(existingSuggestion.metadata, qualification);

    const stored = await this.prisma.orgLeadQualification.upsert({
      where: { orgId_intentId: { orgId: input.orgId, intentId: intent.id } },
      update: {
        fitBand: qualification.fitBand,
        priority: qualification.priority,
        reasons: qualification.reasons,
        updatedByUserId: input.actorUserId,
      },
      create: {
        orgId: input.orgId,
        intentId: intent.id,
        fitBand: qualification.fitBand,
        priority: qualification.priority,
        reasons: qualification.reasons,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    const suggestion = reuseSuggestion
      ? { suggestion: existingSuggestion }
      : await this.suggestions.upsertSuggestion({
          orgId: input.orgId,
          avatarType: 'ORG_X',
          kind: 'lead_qualification',
          subjectType: 'INTENT',
          subjectId: intent.id,
          intentId: intent.id,
          title: 'Organization fit suggestion',
          l1Text: `Fit ${qualification.fitBand}, priority ${qualification.priority}.`,
          metadata: {
            fitBand: qualification.fitBand,
            priority: qualification.priority,
            reasons: qualification.reasons,
            matches: qualification.matches,
          },
          language: intent.language ?? 'EN',
          actorUserId: input.actorUserId,
          channel: input.channel ?? 'ui',
          lifecycleStep: this.mapLifecycleStep(intent.stage as IntentStage),
          pipelineStage: intent.stage as IntentStage,
        });

    return {
      qualification: {
        id: stored.id,
        intentId: stored.intentId,
        fitBand: stored.fitBand,
        priority: stored.priority,
        reasons: Array.isArray(stored.reasons) ? stored.reasons : [],
        updatedAt: stored.updatedAt,
      },
      suggestion: suggestion.suggestion,
    };
  }

  private buildDefaultProfile(orgId: string): OrgAvatarProfilePayload {
    return {
      orgId,
      profileVersion: ORG_PROFILE_VERSION,
      markets: [],
      industries: [],
      clientTypes: [],
      servicePortfolio: [],
      techStack: [],
      excludedSectors: [],
      constraints: {},
    };
  }

  private normalizeProfile(profile: any): OrgAvatarProfilePayload {
    return {
      id: profile.id,
      orgId: profile.orgId,
      profileVersion: profile.profileVersion ?? ORG_PROFILE_VERSION,
      markets: Array.isArray(profile.markets) ? profile.markets : [],
      industries: Array.isArray(profile.industries) ? profile.industries : [],
      clientTypes: Array.isArray(profile.clientTypes) ? profile.clientTypes : [],
      servicePortfolio: Array.isArray(profile.servicePortfolio) ? profile.servicePortfolio : [],
      techStack: Array.isArray(profile.techStack) ? profile.techStack : [],
      excludedSectors: Array.isArray(profile.excludedSectors) ? profile.excludedSectors : [],
      constraints: this.normalizeConstraints(profile.constraints),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private normalizeTagList(value?: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const deduped = new Map<string, string>();
    value.forEach((item) => {
      if (typeof item !== 'string') return;
      const trimmed = item.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, trimmed);
      }
    });
    return Array.from(deduped.values());
  }

  private normalizeConstraints(value?: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private scoreIntent(
    intent: {
      intentName: string;
      goal: string;
      title: string | null;
      client: string | null;
      context: string | null;
      scope: string | null;
      language: string | null;
    },
    profile: OrgAvatarProfilePayload,
  ): QualificationResult {
    const intentText = [
      intent.intentName,
      intent.title,
      intent.goal,
      intent.client,
      intent.context,
      intent.scope,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matches = {
      markets: this.matchTags(profile.markets, intentText),
      industries: this.matchTags(profile.industries, intentText),
      techStack: this.matchTags(profile.techStack, intentText),
      servicePortfolio: this.matchTags(profile.servicePortfolio, intentText),
      clientTypes: this.matchTags(profile.clientTypes, intentText),
      excludedSectors: this.matchTags(profile.excludedSectors, intentText),
    };

    const reasons: string[] = [];

    if (matches.excludedSectors.length > 0) {
      return {
        fitBand: 'NO_FIT',
        priority: 'P3',
        reasons: ['excluded_sector'],
        matches,
      };
    }

    if (profile.markets.length > 0 && matches.markets.length === 0) {
      return {
        fitBand: 'NO_FIT',
        priority: 'P3',
        reasons: ['market_not_supported'],
        matches,
      };
    }

    const supportedLanguages = this.normalizeLanguageList(profile.constraints);
    if (supportedLanguages.length > 0 && intent.language) {
      const normalized = intent.language.toUpperCase();
      if (!supportedLanguages.includes(normalized)) {
        return {
          fitBand: 'NO_FIT',
          priority: 'P3',
          reasons: ['language_not_supported'],
          matches,
        };
      }
    }

    if (matches.industries.length > 0) reasons.push('match_industry');
    if (matches.techStack.length > 0) reasons.push('match_tech');
    if (matches.servicePortfolio.length > 0) reasons.push('match_service');
    if (matches.clientTypes.length > 0) reasons.push('match_client_type');
    if (matches.markets.length > 0) reasons.push('match_market');

    const score =
      matches.industries.length +
      matches.techStack.length +
      matches.servicePortfolio.length +
      matches.clientTypes.length +
      matches.markets.length;

    if (score >= 3) {
      return { fitBand: 'HIGH', priority: 'P1', reasons, matches };
    }
    if (score >= 2) {
      return { fitBand: 'MEDIUM', priority: 'P2', reasons, matches };
    }
    if (score >= 1) {
      return { fitBand: 'LOW', priority: 'P3', reasons, matches };
    }
    return {
      fitBand: 'LOW',
      priority: 'P3',
      reasons: reasons.length ? reasons : ['insufficient_signals'],
      matches,
    };
  }

  private matchTags(tags: string[], intentText: string) {
    if (!tags.length || !intentText) return [];
    return tags.filter((tag) => intentText.includes(tag.toLowerCase()));
  }

  private normalizeLanguageList(constraints: Record<string, unknown>) {
    const raw = constraints.languages ?? constraints.preferredLanguages;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
      .filter(Boolean);
  }

  private matchesQualification(metadata: unknown, next: QualificationResult) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    const data = metadata as Record<string, unknown>;
    return data.fitBand === next.fitBand && data.priority === next.priority;
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

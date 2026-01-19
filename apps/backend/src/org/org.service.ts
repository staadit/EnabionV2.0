import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ulid } from 'ulid';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.types';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { TrustScoreService } from '../trustscore/trustscore.service';
import { isReservedOrgSlug } from './org-slug';

type CreateMemberInput = {
  orgId: string;
  email: string;
  role: UserRole;
};

type UpdateOrgInput = {
  orgId: string;
  actorUserId: string;
  name?: string;
  slug?: string;
  defaultLanguage?: string;
  policyAiEnabled?: boolean;
  policyShareLinksEnabled?: boolean;
  policyEmailIngestEnabled?: boolean;
  providerLanguages?: string[];
  providerRegions?: string[];
  providerTags?: string[];
  providerBudgetBucket?: string;
  providerTeamSizeBucket?: string;
};

type UpdateMemberRoleInput = {
  orgId: string;
  actorUserId: string;
  targetUserId: string;
  role: UserRole;
};

type DeactivateMemberInput = {
  orgId: string;
  actorUserId: string;
  targetUserId: string;
};

const LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'] as const;
const PROVIDER_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;
const PROVIDER_REGION_OPTIONS = ['PL', 'DE', 'NL', 'EU', 'GLOBAL'] as const;
const PROVIDER_BUDGET_BUCKETS = [
  'UNKNOWN',
  'LT_10K',
  'EUR_10K_50K',
  'EUR_50K_150K',
  'EUR_150K_500K',
  'GT_500K',
] as const;
const PROVIDER_TEAM_SIZE_BUCKETS = [
  'UNKNOWN',
  'SOLO',
  'TEAM_2_10',
  'TEAM_11_50',
  'TEAM_51_200',
  'TEAM_201_PLUS',
] as const;
const PROVIDER_LANGUAGE_LIMIT = 8;
const PROVIDER_REGION_LIMIT = 10;
const PROVIDER_TAG_LIMIT = 30;
const PROVIDER_TAG_MAX_LENGTH = 40;

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly events: EventService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async getOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Org not found');
    }
    return org;
  }

  async updateOrg(input: UpdateOrgInput) {
    const org = await this.prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) {
      throw new NotFoundException('Org not found');
    }

    const data: Record<string, any> = {};
    const profileChanges: string[] = [];
    const preferenceChanges: string[] = [];

    if (typeof input.name === 'string') {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException('Org name is required');
      }
      if (name !== org.name) {
        data.name = name;
        profileChanges.push('name');
      }
    }

    if (typeof input.slug === 'string') {
      const slug = this.normalizeSlug(input.slug);
      if (slug !== org.slug) {
        const existing = await this.prisma.organization.findUnique({ where: { slug } });
        if (existing && existing.id !== input.orgId) {
          throw new ConflictException('Slug already in use');
        }
        data.slug = slug;
        profileChanges.push('slug');
      }
    }

    if (typeof input.defaultLanguage === 'string') {
      const lang = input.defaultLanguage.trim().toUpperCase();
      if (!LANGUAGE_OPTIONS.includes(lang as (typeof LANGUAGE_OPTIONS)[number])) {
        throw new BadRequestException('Invalid default language');
      }
      if (lang !== org.defaultLanguage) {
        data.defaultLanguage = lang;
        preferenceChanges.push('defaultLanguage');
      }
    }

    if (typeof input.policyAiEnabled === 'boolean') {
      if (input.policyAiEnabled !== org.policyAiEnabled) {
        data.policyAiEnabled = input.policyAiEnabled;
        preferenceChanges.push('policyAiEnabled');
      }
    }
    if (typeof input.policyShareLinksEnabled === 'boolean') {
      if (input.policyShareLinksEnabled !== org.policyShareLinksEnabled) {
        data.policyShareLinksEnabled = input.policyShareLinksEnabled;
        preferenceChanges.push('policyShareLinksEnabled');
      }
    }
    if (typeof input.policyEmailIngestEnabled === 'boolean') {
      if (input.policyEmailIngestEnabled !== org.policyEmailIngestEnabled) {
        data.policyEmailIngestEnabled = input.policyEmailIngestEnabled;
        preferenceChanges.push('policyEmailIngestEnabled');
      }
    }

    if (Array.isArray(input.providerLanguages)) {
      const normalized = this.normalizeEnumList(
        input.providerLanguages,
        PROVIDER_LANGUAGE_OPTIONS,
        PROVIDER_LANGUAGE_LIMIT,
        'providerLanguages',
      );
      if (!this.arraysEqual(normalized, org.providerLanguages ?? [])) {
        data.providerLanguages = normalized;
        profileChanges.push('providerLanguages');
      }
    }

    if (Array.isArray(input.providerRegions)) {
      const normalized = this.normalizeEnumList(
        input.providerRegions,
        PROVIDER_REGION_OPTIONS,
        PROVIDER_REGION_LIMIT,
        'providerRegions',
      );
      if (!this.arraysEqual(normalized, org.providerRegions ?? [])) {
        data.providerRegions = normalized;
        profileChanges.push('providerRegions');
      }
    }

    if (Array.isArray(input.providerTags)) {
      const normalized = this.normalizeTags(input.providerTags);
      if (!this.arraysEqual(normalized, org.providerTags ?? [])) {
        data.providerTags = normalized;
        profileChanges.push('providerTags');
      }
    }

    if (typeof input.providerBudgetBucket === 'string') {
      const bucket = input.providerBudgetBucket.trim().toUpperCase();
      if (!PROVIDER_BUDGET_BUCKETS.includes(bucket as (typeof PROVIDER_BUDGET_BUCKETS)[number])) {
        throw new BadRequestException('Invalid provider budget bucket');
      }
      if (bucket !== org.providerBudgetBucket) {
        data.providerBudgetBucket = bucket;
        profileChanges.push('providerBudgetBucket');
      }
    }

    if (typeof input.providerTeamSizeBucket === 'string') {
      const bucket = input.providerTeamSizeBucket.trim().toUpperCase();
      if (
        !PROVIDER_TEAM_SIZE_BUCKETS.includes(
          bucket as (typeof PROVIDER_TEAM_SIZE_BUCKETS)[number],
        )
      ) {
        throw new BadRequestException('Invalid provider team size bucket');
      }
      if (bucket !== org.providerTeamSizeBucket) {
        data.providerTeamSizeBucket = bucket;
        profileChanges.push('providerTeamSizeBucket');
      }
    }

    if (Object.keys(data).length === 0) {
      return org;
    }

    const updated = await this.prisma.organization.update({
      where: { id: input.orgId },
      data,
    });

    if (profileChanges.length > 0) {
      await this.emitOrgEvent({
        type: EVENT_TYPES.ORG_PROFILE_UPDATED,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        payload: { payloadVersion: 1, orgId: input.orgId, changedFields: profileChanges },
      });
      await this.trustScore.recalculateOrgTrustScore({
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        reason: 'ORG_PROFILE_UPDATED',
      });
    }

    if (preferenceChanges.length > 0) {
      await this.emitOrgEvent({
        type: EVENT_TYPES.ORG_PREFERENCES_UPDATED,
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        payload: { payloadVersion: 1, orgId: input.orgId, changedFields: preferenceChanges },
      });
    }

    return updated;
  }

  async listMembers(orgId: string) {
    const members = await this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        deactivatedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((member) => ({
      ...member,
      role: this.normalizeRole(member.role),
    }));
  }

  async listMemberOptions(orgId: string) {
    const members = await this.prisma.user.findMany({
      where: { orgId, deactivatedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
      },
      orderBy: { email: 'asc' },
    });
    return members.map((member) => ({
      ...member,
      role: this.normalizeRole(member.role),
    }));
  }

  async createMember(input: CreateMemberInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        orgId: input.orgId,
        email: input.email,
        role: input.role,
        passwordHash: null,
        deactivatedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        deactivatedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const reset = await this.authService.requestPasswordReset(user.email);
    if (reset && typeof reset === 'object' && 'resetToken' in reset) {
      const token = (reset as { resetToken?: string }).resetToken;
      const expiresAt = (reset as { expiresAt?: string }).expiresAt;
      if (token) {
        return {
          user,
          resetToken: token,
          resetExpiresAt: expiresAt,
        };
      }
    }

    return {
      user: {
        ...user,
        role: this.normalizeRole(user.role),
      },
    };
  }

  async updateMemberRole(input: UpdateMemberRoleInput) {
    const target = await this.prisma.user.findFirst({
      where: { id: input.targetUserId, orgId: input.orgId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.deactivatedAt) {
      throw new BadRequestException('User is deactivated');
    }

    const fromRole = this.normalizeRole(target.role);
    const toRole = input.role;
    if (fromRole === toRole) {
      return target;
    }

    if (fromRole === 'Owner' && toRole !== 'Owner') {
      await this.assertNotLastOwner(input.orgId, input.targetUserId, input.actorUserId, 'demote');
    }

    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { role: toRole },
    });

    await this.emitOrgEvent({
      type: EVENT_TYPES.ORG_MEMBER_ROLE_CHANGED,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      subjectType: 'USER',
      subjectId: target.id,
      payload: { payloadVersion: 1, targetUserId: target.id, fromRole, toRole },
    });

    return {
      ...updated,
      role: this.normalizeRole(updated.role),
    };
  }

  async deactivateMember(input: DeactivateMemberInput) {
    const target = await this.prisma.user.findFirst({
      where: { id: input.targetUserId, orgId: input.orgId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.deactivatedAt) {
      return target;
    }

    if (this.normalizeRole(target.role) === 'Owner') {
      await this.assertNotLastOwner(input.orgId, target.id, input.actorUserId, 'deactivate');
    }

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { deactivatedAt: now },
    });

    await this.prisma.session.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: now },
    });

    await this.emitOrgEvent({
      type: EVENT_TYPES.ORG_MEMBER_DEACTIVATED,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      subjectType: 'USER',
      subjectId: target.id,
      payload: { payloadVersion: 1, targetUserId: target.id },
    });

    return {
      ...updated,
      role: this.normalizeRole(updated.role),
    };
  }

  private normalizeSlug(value: string): string {
    const slug = value.trim().toLowerCase();
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }
    if (slug.length < 3 || slug.length > 9) {
      throw new BadRequestException('Slug must be 3-6 characters with optional 2-char suffix');
    }
    const valid = /^[a-z0-9]{3,6}(?:-[0-9]{1,2})?$/.test(slug);
    if (!valid) {
      throw new BadRequestException('Slug format is invalid');
    }
    if (isReservedOrgSlug(slug)) {
      throw new BadRequestException('Slug is reserved');
    }
    return slug;
  }

  private normalizeRole(role: string | null | undefined): UserRole {
    if (role === 'BD-AM') {
      return 'BD_AM';
    }
    return role as UserRole;
  }

  private normalizeEnumList(
    values: string[],
    allowed: readonly string[],
    limit: number,
    field: string,
  ): string[] {
    if (values.length > limit) {
      throw new BadRequestException(`Too many ${field} entries`);
    }
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }
      const candidate = value.trim().toUpperCase();
      if (!candidate) {
        continue;
      }
      if (!allowed.includes(candidate)) {
        throw new BadRequestException(`Invalid ${field} entry`);
      }
      if (!seen.has(candidate)) {
        normalized.push(candidate);
        seen.add(candidate);
      }
    }
    if (normalized.length > limit) {
      throw new BadRequestException(`Too many ${field} entries`);
    }
    return normalized;
  }

  private normalizeTags(values: string[]): string[] {
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const rawValue of values) {
      if (typeof rawValue !== 'string') {
        continue;
      }
      const parts = rawValue.split(',');
      for (const part of parts) {
        const candidate = part.trim().toLowerCase();
        if (!candidate) {
          continue;
        }
        if (candidate.length > PROVIDER_TAG_MAX_LENGTH) {
          throw new BadRequestException('Provider tag is too long');
        }
        if (!seen.has(candidate)) {
          normalized.push(candidate);
          seen.add(candidate);
          if (normalized.length > PROVIDER_TAG_LIMIT) {
            throw new BadRequestException('Too many provider tags');
          }
        }
      }
    }
    return normalized;
  }

  private arraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }
    return true;
  }

  private async assertNotLastOwner(
    orgId: string,
    targetUserId: string,
    actorUserId: string,
    action: 'demote' | 'deactivate',
  ) {
    const ownerCount = await this.prisma.user.count({
      where: { orgId, role: 'Owner', deactivatedAt: null },
    });
    if (ownerCount <= 1) {
      if (targetUserId === actorUserId) {
        throw new ForbiddenException(
          action === 'deactivate' ? 'Cannot deactivate last Owner' : 'Cannot self-demote last Owner',
        );
      }
      throw new ForbiddenException(
        action === 'deactivate' ? 'Cannot deactivate last Owner' : 'Cannot demote last Owner',
      );
    }
  }

  private async emitOrgEvent(input: {
    type: string;
    orgId: string;
    actorUserId: string;
    payload: Record<string, unknown>;
    subjectType?: 'ORG' | 'USER';
    subjectId?: string;
  }) {
    await this.events.emitEvent({
      type: input.type as any,
      occurredAt: new Date(),
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.orgId,
      subjectType: input.subjectType ?? 'ORG',
      subjectId: input.subjectId ?? input.orgId,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'ui',
      correlationId: ulid(),
      payload: input.payload,
    });
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest, USER_ROLES, UserRole } from '../auth/auth.types';
import { OrgService } from './org.service';

const createMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES).optional(),
});

const PROVIDER_LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'] as const;
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

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  defaultLanguage: z.enum(['EN', 'PL', 'DE', 'NL']).optional(),
  policyAiEnabled: z.boolean().optional(),
  policyShareLinksEnabled: z.boolean().optional(),
  policyEmailIngestEnabled: z.boolean().optional(),
  providerLanguages: z.array(z.enum(PROVIDER_LANGUAGE_OPTIONS)).optional(),
  providerRegions: z.array(z.enum(PROVIDER_REGION_OPTIONS)).optional(),
  providerTags: z.array(z.string()).optional(),
  providerBudgetBucket: z.enum(PROVIDER_BUDGET_BUCKETS).optional(),
  providerTeamSizeBucket: z.enum(PROVIDER_TEAM_SIZE_BUCKETS).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

@UseGuards(AuthGuard)
@Controller('v1/org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('me')
  async getOrg(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);

    const org = await this.orgService.getOrg(user.orgId);
    return { org: this.toOrgResponse(org) };
  }

  @Patch('me')
  async updateOrg(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const parsed = this.parseBody(updateOrgSchema, body);
    const updated = await this.orgService.updateOrg({
      orgId: user.orgId,
      actorUserId: user.id,
      ...parsed,
    });
    return { org: this.toOrgResponse(updated) };
  }

  @Get('members')
  async listMembers(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const members = await this.orgService.listMembers(user.orgId);
    return { members };
  }

  @Get('members/lookup')
  async listMemberLookup(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    const members = await this.orgService.listMemberOptions(user.orgId);
    return { members };
  }

  @Post('members')
  async createMember(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const parsed = this.parseBody(createMemberSchema, body);
    const email = parsed.email.trim().toLowerCase();
    const role = parsed.role ?? 'Viewer';

    return this.orgService.createMember({
      orgId: user.orgId,
      email,
      role,
    });
  }

  @Patch('members/:userId/role')
  async updateMemberRole(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const parsed = this.parseBody(updateRoleSchema, body);
    const updated = await this.orgService.updateMemberRole({
      orgId: user.orgId,
      actorUserId: user.id,
      targetUserId: userId,
      role: parsed.role,
    });
    return { member: updated };
  }

  @Post('members/:userId/deactivate')
  async deactivateMember(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const updated = await this.orgService.deactivateMember({
      orgId: user.orgId,
      actorUserId: user.id,
      targetUserId: userId,
    });
    return { member: updated };
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }

  private assertOwner(role: UserRole) {
    if (role !== 'Owner') {
      throw new ForbiddenException('Owner role required');
    }
  }

  private parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
    const result = schema.safeParse(body);
    if (result.success) {
      return result.data;
    }

    const message = result.error.issues.map((issue) => issue.message).join('; ');
    throw new BadRequestException(message || 'Invalid request');
  }

  private toOrgResponse(org: any) {
    const domain = (process.env.INBOUND_EMAIL_DOMAIN || '').trim();
    const inboundEmailAddress = domain ? `${org.slug}@${domain}` : undefined;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      defaultLanguage: org.defaultLanguage,
      policyAiEnabled: org.policyAiEnabled,
      policyShareLinksEnabled: org.policyShareLinksEnabled,
      policyEmailIngestEnabled: org.policyEmailIngestEnabled,
      providerLanguages: org.providerLanguages,
      providerRegions: org.providerRegions,
      providerTags: org.providerTags,
      providerBudgetBucket: org.providerBudgetBucket,
      providerTeamSizeBucket: org.providerTeamSizeBucket,
      inboundEmailAddress,
    };
  }
}

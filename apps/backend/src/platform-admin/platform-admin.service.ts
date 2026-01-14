import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';
import { AuthUser } from '../auth/auth.types';
import { EventService } from '../events/event.service';
import { EVENT_TYPES, EVENT_TYPE_LIST } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { NdaService } from '../nda/nda.service';

const REDACT_KEYS = new Set([
  'body',
  'content',
  'raw',
  'html',
  'text',
  'attachments',
  'headers',
  'sourcetext',
  'source_text',
]);
const MAX_REDACT_DEPTH = 6;

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACT_DEPTH) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, depth + 1));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.has(key.toLowerCase())) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactValue(entry, depth + 1);
      }
    }
    return output;
  }
  return value;
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly nda: NdaService,
  ) {}

  async listTenants(actor: AuthUser, query: { q?: unknown; limit?: unknown; cursor?: unknown }) {
    const q = normalizeString(query.q);
    const cursor = normalizeString(query.cursor);
    const limit = this.parseLimit(query.limit);

    const where: Prisma.OrganizationWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { id: q },
      ];
    }

    const take = limit + 1;
    const orgs = await this.prisma.organization.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = orgs.length > limit;
    const items = hasNext ? orgs.slice(0, limit) : orgs;
    const nextCursor = hasNext ? items[items.length - 1]?.id : undefined;

    const orgIds = items.map((org) => org.id);
    const [userCounts, intentCounts] = await Promise.all([
      orgIds.length
        ? this.prisma.user.groupBy({
            by: ['orgId'],
            where: { orgId: { in: orgIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      orgIds.length
        ? this.prisma.event.groupBy({
            by: ['orgId'],
            where: { orgId: { in: orgIds }, type: EVENT_TYPES.INTENT_CREATED },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const userCountByOrg = new Map(userCounts.map((row) => [row.orgId, row._count._all]));
    const intentCountByOrg = new Map(intentCounts.map((row) => [row.orgId, row._count._all]));

    const tenants = items.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.createdAt,
      userCount: userCountByOrg.get(org.id) || 0,
      intentCount: intentCountByOrg.get(org.id) || 0,
    }));

    await this.emitAudit(actor, {
      action: 'TENANTS_LIST',
      targetType: 'TENANT',
      query: q ? { q, limit, cursor } : { limit, cursor },
      resultCount: tenants.length,
    });

    return { tenants, nextCursor };
  }

  async getTenant(actor: AuthUser, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    const [userCount, intentCount] = await Promise.all([
      this.prisma.user.count({ where: { orgId } }),
      this.prisma.event.count({ where: { orgId, type: EVENT_TYPES.INTENT_CREATED } }),
    ]);

    await this.emitAudit(actor, {
      action: 'TENANT_VIEW',
      targetType: 'TENANT',
      targetOrgId: orgId,
      targetId: orgId,
    });

    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.createdAt,
      },
      counts: { userCount, intentCount },
    };
  }

  async listTenantUsers(actor: AuthUser, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    const users = await this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        deactivatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    await this.emitAudit(actor, {
      action: 'TENANT_USERS_LIST',
      targetType: 'TENANT',
      targetOrgId: orgId,
      targetId: orgId,
      resultCount: users.length,
    });

    return { org: { id: org.id, name: org.name, slug: org.slug }, users };
  }

  async searchUsers(actor: AuthUser, query: { email?: unknown; userId?: unknown }) {
    const email = normalizeString(query.email)?.toLowerCase();
    const userId = normalizeString(query.userId);
    if (!email && !userId) {
      throw new BadRequestException('email or userId is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        ...(email ? { email } : {}),
        ...(userId ? { id: userId } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        deactivatedAt: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    await this.emitAudit(actor, {
      action: 'USER_SEARCH',
      targetType: 'USER',
      targetOrgId: user?.org?.id,
      targetUserId: user?.id,
      targetId: user?.id,
      query: { email, userId },
      resultCount: user ? 1 : 0,
    });

    return { user };
  }

  async getUser(actor: AuthUser, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        deactivatedAt: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const activeSessions = await this.prisma.session.count({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    await this.emitAudit(actor, {
      action: 'USER_VIEW',
      targetType: 'USER',
      targetOrgId: user.org?.id,
      targetUserId: user.id,
      targetId: user.id,
    });

    return { user, activeSessions };
  }

  async listEvents(
    actor: AuthUser,
    query: {
      orgId?: unknown;
      subjectId?: unknown;
      type?: unknown;
      from?: unknown;
      to?: unknown;
      limit?: unknown;
    },
  ) {
    const orgId = normalizeString(query.orgId);
    const subjectId = normalizeString(query.subjectId);
    const type = normalizeString(query.type);
    const limit = this.parseLimit(query.limit);

    if (!orgId && !subjectId && !type) {
      throw new BadRequestException('orgId, subjectId, or type is required');
    }
    if (type && !EVENT_TYPE_LIST.includes(type as any)) {
      throw new BadRequestException('Unknown event type');
    }

    const from = this.parseDate(query.from, 'from');
    const to = this.parseDate(query.to, 'to');

    const where: Prisma.EventWhereInput = {
      ...(orgId ? { orgId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(type ? { type } : {}),
      ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        org: { select: { id: true, name: true, slug: true } },
      },
    });

    const items = events.map((event) => ({
      orgId: event.orgId,
      orgName: event.org?.name,
      orgSlug: event.org?.slug,
      type: event.type,
      occurredAt: event.occurredAt,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      channel: event.channel,
      correlationId: event.correlationId,
      payload: redactValue(event.payload),
    }));

    await this.emitAudit(actor, {
      action: 'EVENTS_QUERY',
      targetType: 'EVENTS',
      query: { orgId, subjectId, type, from: from?.toISOString(), to: to?.toISOString(), limit },
      resultCount: items.length,
    });

    return { events: items };
  }

  async listNdaDocuments(actor: AuthUser) {
    await this.nda.ensureSeedDocument();
    const documents = await this.nda.listDocuments();
    await this.emitAudit(actor, {
      action: 'NDA_LIST',
      targetType: 'NDA',
      resultCount: documents.length,
    });
    return { documents };
  }

  async createNdaDocument(
    actor: AuthUser,
    input: {
      ndaVersion: string;
      enMarkdown: string;
      summaryPl?: string | null;
      summaryDe?: string | null;
      summaryNl?: string | null;
      isActive?: boolean;
    },
  ) {
    const document = await this.nda.createDocument({
      ndaVersion: input.ndaVersion.trim(),
      enMarkdown: input.enMarkdown,
      summaryPl: input.summaryPl ?? null,
      summaryDe: input.summaryDe ?? null,
      summaryNl: input.summaryNl ?? null,
      isActive: input.isActive ?? false,
    });
    await this.emitAudit(actor, {
      action: 'NDA_CREATE',
      targetType: 'NDA',
      targetId: document.id,
    });
    return { document };
  }

  async updateNdaDocument(
    actor: AuthUser,
    id: string,
    input: {
      ndaVersion?: string;
      enMarkdown?: string;
      summaryPl?: string | null;
      summaryDe?: string | null;
      summaryNl?: string | null;
      isActive?: boolean;
    },
  ) {
    const document = await this.nda.updateDocument(id, {
      ndaVersion: input.ndaVersion?.trim(),
      enMarkdown: input.enMarkdown,
      summaryPl: input.summaryPl === undefined ? undefined : input.summaryPl,
      summaryDe: input.summaryDe === undefined ? undefined : input.summaryDe,
      summaryNl: input.summaryNl === undefined ? undefined : input.summaryNl,
      isActive: input.isActive,
    });
    await this.emitAudit(actor, {
      action: 'NDA_UPDATE',
      targetType: 'NDA',
      targetId: document.id,
    });
    return { document };
  }

  async deleteNdaDocument(actor: AuthUser, id: string) {
    await this.nda.deleteDocument(id);
    await this.emitAudit(actor, {
      action: 'NDA_DELETE',
      targetType: 'NDA',
      targetId: id,
    });
  }

  private parseLimit(value: unknown): number {
    const raw = typeof value === 'string' ? Number(value) : undefined;
    if (!raw || Number.isNaN(raw)) {
      return 50;
    }
    return Math.max(1, Math.min(raw, 200));
  }

  private parseDate(value: unknown, label: string): Date | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${label} date`);
    }
    return parsed;
  }

  private async emitAudit(
    actor: AuthUser,
    input: {
      action: string;
      targetType: 'TENANT' | 'USER' | 'EVENTS' | 'EMAIL_INGEST' | 'NDA';
      targetOrgId?: string;
      targetUserId?: string;
      targetId?: string;
      query?: Record<string, unknown>;
      resultCount?: number;
    },
  ) {
    const payload: Record<string, unknown> = {
      payloadVersion: 1,
      action: input.action,
      targetType: input.targetType,
    };
    if (input.targetOrgId) payload.targetOrgId = input.targetOrgId;
    if (input.targetUserId) payload.targetUserId = input.targetUserId;
    if (input.targetId) payload.targetId = input.targetId;
    if (input.query) {
      const cleaned = Object.fromEntries(
        Object.entries(input.query).filter(([, value]) => value !== undefined),
      );
      if (Object.keys(cleaned).length) {
        payload.query = cleaned;
      }
    }
    if (typeof input.resultCount === 'number') payload.resultCount = input.resultCount;

    const orgId = input.targetOrgId ?? actor.orgId;

    await this.events.emitEvent({
      type: EVENT_TYPES.PLATFORM_ADMIN_AUDIT,
      occurredAt: new Date(),
      orgId,
      actorUserId: actor.id,
      actorOrgId: actor.orgId,
      subjectType: 'USER',
      subjectId: actor.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'system',
      correlationId: ulid(),
      payload,
    });
  }
}

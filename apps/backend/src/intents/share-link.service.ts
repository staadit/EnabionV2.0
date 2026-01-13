import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IntentRedactionService } from './intent-redaction.service';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { ulid } from 'ulid';

type CreateShareLinkInput = {
  orgId: string;
  intentId: string;
  actorUserId: string;
};

@Injectable()
export class ShareLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redaction: IntentRedactionService,
    private readonly events: EventService,
  ) {}

  async createShareLink(input: CreateShareLinkInput) {
    const intent = await this.prisma.intent.findFirst({
      where: { id: input.intentId, orgId: input.orgId },
      select: { id: true, orgId: true },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    const ttlDays = this.resolveTtlDays();
    const expiresAt = this.addDays(new Date(), ttlDays);
    const token = this.generateToken();
    const tokenHashSha256 = this.hashToken(token);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.intentShareLink.updateMany({
        where: {
          intentId: intent.id,
          orgId: input.orgId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, revokedByUserId: input.actorUserId },
      });

      await tx.intentShareLink.create({
        data: {
          orgId: input.orgId,
          intentId: intent.id,
          createdByUserId: input.actorUserId,
          tokenHashSha256,
          expiresAt,
        },
      });
    });

    return {
      token,
      expiresAt,
      shareUrl: `/share/intent/${token}`,
    };
  }

  async listShareLinks(orgId: string, intentId: string) {
    await this.ensureIntent(orgId, intentId);
    return this.prisma.intentShareLink.findMany({
      where: { orgId, intentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        revokedByUserId: true,
        accessCount: true,
        lastAccessAt: true,
      },
    });
  }

  async revokeShareLink(orgId: string, intentId: string, shareLinkId: string, actorUserId: string) {
    const link = await this.prisma.intentShareLink.findFirst({
      where: { id: shareLinkId, intentId, orgId },
      select: { id: true, revokedAt: true },
    });
    if (!link) {
      throw new NotFoundException('Share link not found');
    }
    if (link.revokedAt) {
      return;
    }
    await this.prisma.intentShareLink.update({
      where: { id: shareLinkId },
      data: { revokedAt: new Date(), revokedByUserId: actorUserId },
    });
  }

  async resolvePublicView(token: string) {
    if (!token || token.length < 8) {
      throw new NotFoundException('Share link not found');
    }
    const tokenHashSha256 = this.hashToken(token);
    const now = new Date();
    const link = await this.prisma.intentShareLink.findFirst({
      where: {
        tokenHashSha256,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    await this.prisma.intentShareLink.update({
      where: { id: link.id },
      data: { accessCount: { increment: 1 }, lastAccessAt: now },
    });

    const [view, intent] = await Promise.all([
      this.redaction.getShareViewByIntentId(link.intentId),
      this.prisma.intent.findUnique({
        where: { id: link.intentId },
        select: { id: true, stage: true },
      }),
    ]);

    const correlationId = ulid();
    await this.events.emitEvent({
      orgId: link.orgId,
      actorUserId: null,
      actorOrgId: link.orgId,
      subjectType: 'SHARE_LINK',
      subjectId: link.id,
      lifecycleStep: this.mapLifecycleStep(intent?.stage),
      pipelineStage: (intent?.stage as any) || 'NEW',
      channel: 'api',
      correlationId,
      occurredAt: now,
      type: EVENT_TYPES.INTENT_SHARED_LINK_VIEWED,
      payload: {
        payloadVersion: 1,
        intentId: link.intentId,
        shareTokenId: link.id,
      },
    });

    return {
      intent: view.intent,
      attachments: view.attachments,
      share: {
        expiresAt: link.expiresAt.toISOString(),
        l1Only: true,
      },
      hasL2: view.intent.hasL2,
      ndaRequired: view.intent.ndaRequired,
    };
  }

  private async ensureIntent(orgId: string, intentId: string) {
    const exists = await this.prisma.intent.findFirst({
      where: { id: intentId, orgId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Intent not found');
    }
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string) {
    const pepper = process.env.SHARE_LINK_TOKEN_PEPPER || '';
    return createHash('sha256').update(token + pepper).digest('hex');
  }

  private resolveTtlDays() {
    const raw = process.env.SHARE_LINK_TTL_DAYS;
    const maxRaw = process.env.SHARE_LINK_MAX_TTL_DAYS;
    const fallback = 14;
    const parsed = raw ? Number(raw) : fallback;
    const ttl = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    if (maxRaw) {
      const max = Number(maxRaw);
      if (Number.isFinite(max) && max > 0 && ttl > max) return max;
    }
    return ttl;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private mapLifecycleStep(stage?: string | null) {
    const value = stage?.toUpperCase();
    if (value === 'MATCH') return 'MATCH_ALIGN';
    if (value === 'COMMIT') return 'COMMIT_ASSURE';
    return 'CLARIFY';
  }
}

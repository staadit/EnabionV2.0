import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NdaService } from '../nda/nda.service';
import { ConfidentialityLevel } from '../blobstore/types';
import { buildIntentShortId } from './intent.utils';

type IntentRecord = {
  id: string;
  intentNumber: number;
  intentName: string;
  orgId: string;
  goal: string;
  title: string | null;
  client: string | null;
  stage: string;
  language: string;
  lastActivityAt: Date;
  sourceTextRaw: string | null;
};

type NdaGate = {
  canViewL2: boolean;
  reason?: 'NDA_REQUIRED' | 'NOT_L2';
};

export type IntentRedactionView = {
  id: string;
  shortId: string;
  intentName: string;
  title: string | null;
  goal: string;
  client: string | null;
  clientOrgName?: string | null;
  senderOrgId?: string | null;
  recipientRole?: 'Y' | 'Z';
  ndaRequestedAt?: string | null;
  stage: string;
  language: string;
  lastActivityAt: string;
  sourceTextRaw: string | null;
  hasL2: boolean;
  l2Redacted: boolean;
  ndaRequired: boolean;
  confidentialityLevel: ConfidentialityLevel;
  ndaGate: NdaGate;
};

export type AttachmentRedactionView = {
  id: string;
  originalName: string;
  sizeBytes: number;
  confidentialityLevel: ConfidentialityLevel;
  createdAt: string;
  canDownload: boolean;
};

export type IncomingIntentListItem = {
  intentId: string;
  intentName: string;
  title: string | null;
  clientOrgName: string | null;
  status: string;
  deadlineAt: string | null;
  confidentialityLevel: ConfidentialityLevel;
  ndaGate: NdaGate;
  senderOrgId: string;
  recipientRole: 'Y' | 'Z';
  ndaRequestedAt: string | null;
};

@Injectable()
export class IntentRedactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ndaService: NdaService,
  ) {}

  async getShareViewByIntentId(intentId: string): Promise<{
    intent: IntentRedactionView;
    attachments: AttachmentRedactionView[];
  }> {
    const intent = await this.loadIntent(intentId);
    const attachments = await this.loadAttachments(intent);
    const hasL2 = this.computeHasL2(intent, attachments);
    const view = this.buildIntentView(intent, {
      allowL2: false,
      hasL2,
      viewerOrgId: null,
    });
    return {
      intent: view,
      attachments: this.mapAttachments(attachments, {
        allowDownloads: false,
        allowL2: false,
        viewerOrgId: null,
        ownerOrgId: intent.orgId,
      }),
    };
  }

  async listIncomingIntents(viewerOrgId: string): Promise<IncomingIntentListItem[]> {
    const recipients = await this.prisma.intentRecipient.findMany({
      where: {
        recipientOrgId: viewerOrgId,
        status: { not: 'REVOKED' },
      },
      select: {
        intentId: true,
        senderOrgId: true,
        recipientRole: true,
        ndaRequestedAt: true,
        intent: {
          select: {
            id: true,
            intentName: true,
            title: true,
            stage: true,
            deadlineAt: true,
            sourceTextLength: true,
            lastActivityAt: true,
            orgId: true,
          },
        },
        senderOrg: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        intent: {
          lastActivityAt: 'desc',
        },
      },
    });

    const intentIds = recipients.map((recipient) => recipient.intentId);
    const l2AttachmentIntentIds = await this.loadL2AttachmentIntentIds(intentIds);

    const items = await Promise.all(
      recipients.map(async (recipient) => {
        const intent = recipient.intent;
        if (!intent) {
          return null;
        }
        const hasL2Source = Boolean(
          typeof intent.sourceTextLength === 'number' && intent.sourceTextLength > 0,
        );
        const hasL2 = hasL2Source || l2AttachmentIntentIds.has(intent.id);
        const allowL2 = await this.resolveL2Access(intent.orgId, viewerOrgId);
        const ndaGate = this.buildNdaGate(hasL2, allowL2);
        return {
          intentId: intent.id,
          intentName: intent.intentName,
          title: intent.title,
          clientOrgName: recipient.senderOrg?.name ?? null,
          status: intent.stage,
          deadlineAt: intent.deadlineAt ? intent.deadlineAt.toISOString() : null,
          confidentialityLevel: hasL2 ? 'L2' : 'L1',
          ndaGate,
          senderOrgId: recipient.senderOrgId,
          recipientRole: recipient.recipientRole as 'Y' | 'Z',
          ndaRequestedAt: recipient.ndaRequestedAt
            ? recipient.ndaRequestedAt.toISOString()
            : null,
        } satisfies IncomingIntentListItem;
      }),
    );

    return items.filter(Boolean) as IncomingIntentListItem[];
  }

  async getIncomingView(
    intentId: string,
    viewerOrgId: string,
  ): Promise<IntentRedactionView> {
    const recipient = await this.loadIncomingRecipient(intentId, viewerOrgId);
    const intent = await this.loadIntent(intentId);
    const allowL2 = await this.resolveL2Access(intent.orgId, viewerOrgId);
    const hasL2Attachments = await this.hasL2Attachments(intent);
    const view = this.buildIntentView(intent, {
      allowL2,
      hasL2: this.computeHasL2(intent, undefined, hasL2Attachments),
      viewerOrgId,
    });
    return {
      ...view,
      clientOrgName: recipient.senderOrgName,
      senderOrgId: recipient.senderOrgId,
      recipientRole: recipient.recipientRole,
      ndaRequestedAt: recipient.ndaRequestedAt,
    };
  }

  async getIncomingPayload(
    intentId: string,
    viewerOrgId: string,
  ): Promise<{
    intent: IntentRedactionView;
    attachments: AttachmentRedactionView[];
  }> {
    const recipient = await this.loadIncomingRecipient(intentId, viewerOrgId);
    const intent = await this.loadIntent(intentId);
    const attachments = await this.loadAttachments(intent);
    const allowL2 = await this.resolveL2Access(intent.orgId, viewerOrgId);
    const hasL2 = this.computeHasL2(intent, attachments);
    return {
      intent: {
        ...this.buildIntentView(intent, {
          allowL2,
          hasL2,
          viewerOrgId,
        }),
        clientOrgName: recipient.senderOrgName,
        senderOrgId: recipient.senderOrgId,
        recipientRole: recipient.recipientRole,
        ndaRequestedAt: recipient.ndaRequestedAt,
      },
      attachments: this.mapAttachments(attachments, {
        allowDownloads: true,
        allowL2,
        viewerOrgId,
        ownerOrgId: intent.orgId,
      }),
    };
  }

  async getExportView(
    intentId: string,
    viewerOrgId: string,
  ): Promise<{ intent: IntentRedactionView; markdown: string }> {
    const intent = await this.loadIntent(intentId);
    if (intent.orgId !== viewerOrgId) {
      throw new ForbiddenException('Export is limited to the owning org');
    }
    const hasL2Attachments = await this.hasL2Attachments(intent);
    const view = this.buildIntentView(intent, {
      allowL2: false,
      hasL2: this.computeHasL2(intent, undefined, hasL2Attachments),
      viewerOrgId,
    });
    return { intent: view, markdown: this.buildMarkdown(view) };
  }

  private async loadIntent(intentId: string): Promise<IntentRecord> {
    const intent = await this.prisma.intent.findUnique({
      where: { id: intentId },
      select: {
        id: true,
        intentNumber: true,
        intentName: true,
        orgId: true,
        goal: true,
        title: true,
        client: true,
        stage: true,
        language: true,
        lastActivityAt: true,
        sourceTextRaw: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }
    return intent as IntentRecord;
  }

  private async loadIncomingRecipient(intentId: string, viewerOrgId: string) {
    const recipient = await this.prisma.intentRecipient.findFirst({
      where: {
        intentId,
        recipientOrgId: viewerOrgId,
        status: { not: 'REVOKED' },
      },
      select: {
        senderOrgId: true,
        recipientRole: true,
        ndaRequestedAt: true,
        senderOrg: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!recipient) {
      throw new NotFoundException('Intent not found');
    }
    return {
      senderOrgId: recipient.senderOrgId,
      senderOrgName: recipient.senderOrg?.name ?? null,
      recipientRole: recipient.recipientRole as 'Y' | 'Z',
      ndaRequestedAt: recipient.ndaRequestedAt
        ? recipient.ndaRequestedAt.toISOString()
        : null,
    };
  }

  private async loadAttachments(intent: IntentRecord) {
    return this.prisma.attachment.findMany({
      where: { intentId: intent.id, orgId: intent.orgId },
      include: { blob: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async hasL2Attachments(intent: IntentRecord): Promise<boolean> {
    const count = await this.prisma.attachment.count({
      where: {
        intentId: intent.id,
        orgId: intent.orgId,
        blob: { confidentiality: 'L2' },
      },
    });
    return count > 0;
  }

  private async loadL2AttachmentIntentIds(intentIds: string[]) {
    if (!intentIds.length) {
      return new Set<string>();
    }
    const rows = await this.prisma.attachment.findMany({
      where: {
        intentId: { in: intentIds },
        blob: { confidentiality: 'L2' },
      },
      select: { intentId: true },
      distinct: ['intentId'],
    });
    return new Set(rows.map((row) => row.intentId));
  }

  private async resolveL2Access(ownerOrgId: string, viewerOrgId: string): Promise<boolean> {
    if (ownerOrgId === viewerOrgId) {
      return true;
    }
    return this.ndaService.hasMutualAcceptance({ ownerOrgId, viewerOrgId });
  }

  private computeHasL2(
    intent: IntentRecord,
    attachments?: Array<{ blob?: { confidentiality?: ConfidentialityLevel | null } | null }>,
    hasL2Attachments?: boolean,
  ) {
    const hasL2Source = Boolean(intent.sourceTextRaw && intent.sourceTextRaw.trim());
    const hasAttachments =
      typeof hasL2Attachments === 'boolean'
        ? hasL2Attachments
        : Boolean(
            attachments?.some((attachment) => attachment.blob?.confidentiality === 'L2'),
          );
    return hasL2Source || hasAttachments;
  }

  private buildIntentView(intent: IntentRecord, input: {
    allowL2: boolean;
    hasL2: boolean;
    viewerOrgId: string | null;
  }): IntentRedactionView {
    const isInternal = input.viewerOrgId === intent.orgId;
    const l2Redacted = input.hasL2 && !input.allowL2;
    const confidentialityLevel: ConfidentialityLevel = input.hasL2 ? 'L2' : 'L1';
    const ndaGate = this.buildNdaGate(input.hasL2, input.allowL2);
    return {
      id: intent.id,
      shortId: buildIntentShortId(intent.intentNumber),
      intentName: intent.intentName,
      title: intent.title,
      goal: intent.goal,
      client: intent.client,
      stage: intent.stage,
      language: intent.language,
      lastActivityAt: intent.lastActivityAt.toISOString(),
      sourceTextRaw: input.allowL2 ? intent.sourceTextRaw : null,
      hasL2: input.hasL2,
      l2Redacted,
      ndaRequired: l2Redacted && !isInternal,
      confidentialityLevel,
      ndaGate,
    };
  }

  private mapAttachments(
    attachments: Array<{ id: string; filename: string; createdAt: Date; blob?: any }>,
    input: {
      allowDownloads: boolean;
      allowL2: boolean;
      viewerOrgId: string | null;
      ownerOrgId: string;
    },
  ): AttachmentRedactionView[] {
    return attachments.map((attachment) => {
      const confidentiality = (attachment.blob?.confidentiality ?? 'L1') as ConfidentialityLevel;
      const isInternal = input.viewerOrgId === input.ownerOrgId;
      const canDownload = input.allowDownloads
        ? isInternal || confidentiality === 'L1' || input.allowL2
        : false;
      const redactMeta = confidentiality === 'L2' && !input.allowL2 && !isInternal;
      return {
        id: attachment.id,
        originalName: redactMeta ? 'Locked attachment' : attachment.filename,
        sizeBytes: redactMeta ? 0 : Number(attachment.blob?.sizeBytes ?? 0),
        confidentialityLevel: confidentiality,
        createdAt: attachment.createdAt.toISOString(),
        canDownload,
      };
    });
  }

  private buildMarkdown(intent: IntentRedactionView): string {
    const title = intent.intentName || intent.title || 'Intent';
    const lines = [`# ${title}`, '', `Goal: ${intent.goal}`];
    if (intent.client) lines.push(`Client: ${intent.client}`);
    lines.push(`Stage: ${intent.stage}`);
    return `${lines.join('\n')}\n`;
  }

  private buildNdaGate(hasL2: boolean, allowL2: boolean): NdaGate {
    if (!hasL2) {
      return { canViewL2: true, reason: 'NOT_L2' };
    }
    if (allowL2) {
      return { canViewL2: true };
    }
    return { canViewL2: false, reason: 'NDA_REQUIRED' };
  }
}

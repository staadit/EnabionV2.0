import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NdaService } from '../nda/nda.service';
import { ConfidentialityLevel } from '../blobstore/types';

type IntentRecord = {
  id: string;
  orgId: string;
  goal: string;
  title: string | null;
  client: string | null;
  stage: string;
  language: string;
  lastActivityAt: Date;
  sourceTextRaw: string | null;
};

export type IntentRedactionView = {
  id: string;
  title: string | null;
  goal: string;
  client: string | null;
  stage: string;
  language: string;
  lastActivityAt: string;
  sourceTextRaw: string | null;
  hasL2: boolean;
  l2Redacted: boolean;
  ndaRequired: boolean;
};

export type AttachmentRedactionView = {
  id: string;
  originalName: string;
  sizeBytes: number;
  confidentialityLevel: ConfidentialityLevel;
  createdAt: string;
  canDownload: boolean;
};

@Injectable()
export class IntentRedactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ndaService: NdaService,
  ) {}

  async getShareView(token: string): Promise<{
    intent: IntentRedactionView;
    attachments: AttachmentRedactionView[];
  }> {
    // Share tokens are mapped to intent IDs until share links are implemented.
    const intent = await this.loadIntent(token);
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

  async getIncomingView(
    intentId: string,
    viewerOrgId: string,
  ): Promise<IntentRedactionView> {
    const intent = await this.loadIntent(intentId);
    const allowL2 = await this.resolveL2Access(intent.orgId, viewerOrgId);
    const hasL2Attachments = await this.hasL2Attachments(intent);
    return this.buildIntentView(intent, {
      allowL2,
      hasL2: this.computeHasL2(intent, undefined, hasL2Attachments),
      viewerOrgId,
    });
  }

  async getIncomingPayload(
    intentId: string,
    viewerOrgId: string,
  ): Promise<{
    intent: IntentRedactionView;
    attachments: AttachmentRedactionView[];
  }> {
    const intent = await this.loadIntent(intentId);
    const attachments = await this.loadAttachments(intent);
    const allowL2 = await this.resolveL2Access(intent.orgId, viewerOrgId);
    const hasL2 = this.computeHasL2(intent, attachments);
    return {
      intent: this.buildIntentView(intent, {
        allowL2,
        hasL2,
        viewerOrgId,
      }),
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
    return {
      id: intent.id,
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
    const title = intent.title || 'Intent';
    const lines = [`# ${title}`, '', `Goal: ${intent.goal}`];
    if (intent.client) lines.push(`Client: ${intent.client}`);
    lines.push(`Stage: ${intent.stage}`);
    return `${lines.join('\n')}\n`;
  }
}

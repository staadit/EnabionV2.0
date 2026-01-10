import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { NdaChannel, NdaType } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { EventService } from '../events/event.service';
import { EVENT_TYPES, type Channel } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import {
  NDA_FILES,
  NDA_LANGUAGES,
  NDA_TYPE_MUTUAL,
  NDA_VERSION,
  type NdaLanguage,
} from './nda.constants';

type NdaDocumentSource = 'db' | 'file';

export type NdaDocumentPayload = {
  id?: string;
  ndaType: NdaType;
  ndaVersion: string;
  enMarkdown: string;
  summaryPl?: string | null;
  summaryDe?: string | null;
  summaryNl?: string | null;
  enHashSha256: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  source: NdaDocumentSource;
};

export type NdaAcceptancePayload = {
  id: string;
  orgId: string;
  counterpartyOrgId?: string | null;
  ndaType: NdaType;
  ndaVersion: string;
  enHashSha256: string;
  acceptedByUserId: string;
  acceptedAt: Date;
  language: string;
  channel: NdaChannel;
  typedName: string;
  typedRole: string;
};

@Injectable()
export class NdaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
  ) {}

  normalizeLanguage(value?: string | null): NdaLanguage {
    if (!value) return 'EN';
    const upper = value.toUpperCase();
    if (NDA_LANGUAGES.includes(upper as NdaLanguage)) {
      return upper as NdaLanguage;
    }
    return 'EN';
  }

  async listDocuments(): Promise<NdaDocumentPayload[]> {
    const docs = await this.prisma.ndaDocument.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map((doc) => ({
      ...doc,
      source: 'db',
    }));
  }

  async getDocumentById(id: string): Promise<NdaDocumentPayload> {
    const doc = await this.prisma.ndaDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('NDA document not found');
    }
    return { ...doc, source: 'db' };
  }

  async createDocument(input: {
    ndaVersion: string;
    enMarkdown: string;
    summaryPl?: string | null;
    summaryDe?: string | null;
    summaryNl?: string | null;
    isActive?: boolean;
  }): Promise<NdaDocumentPayload> {
    const enHashSha256 = this.computeSha256(input.enMarkdown);
    const createData = {
      ndaType: NDA_TYPE_MUTUAL,
      ndaVersion: input.ndaVersion,
      enMarkdown: input.enMarkdown,
      summaryPl: input.summaryPl ?? null,
      summaryDe: input.summaryDe ?? null,
      summaryNl: input.summaryNl ?? null,
      enHashSha256,
      isActive: Boolean(input.isActive),
    };

    const created = await this.prisma.$transaction(async (tx) => {
      if (createData.isActive) {
        await tx.ndaDocument.updateMany({
          where: { ndaType: NDA_TYPE_MUTUAL, isActive: true },
          data: { isActive: false },
        });
      }
      return tx.ndaDocument.create({ data: createData });
    });

    return { ...created, source: 'db' };
  }

  async updateDocument(
    id: string,
    input: {
      ndaVersion?: string;
      enMarkdown?: string;
      summaryPl?: string | null;
      summaryDe?: string | null;
      summaryNl?: string | null;
      isActive?: boolean;
    },
  ): Promise<NdaDocumentPayload> {
    const existing = await this.prisma.ndaDocument.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('NDA document not found');
    }

    const enMarkdown = input.enMarkdown ?? existing.enMarkdown;
    const enHashSha256 =
      input.enMarkdown !== undefined ? this.computeSha256(enMarkdown) : existing.enHashSha256;

    const updateData = {
      ndaVersion: input.ndaVersion ?? existing.ndaVersion,
      enMarkdown,
      summaryPl: input.summaryPl === undefined ? existing.summaryPl : input.summaryPl,
      summaryDe: input.summaryDe === undefined ? existing.summaryDe : input.summaryDe,
      summaryNl: input.summaryNl === undefined ? existing.summaryNl : input.summaryNl,
      enHashSha256,
      isActive: input.isActive ?? existing.isActive,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      if (updateData.isActive) {
        await tx.ndaDocument.updateMany({
          where: { ndaType: NDA_TYPE_MUTUAL, isActive: true, NOT: { id } },
          data: { isActive: false },
        });
      }
      return tx.ndaDocument.update({ where: { id }, data: updateData });
    });

    return { ...updated, source: 'db' };
  }

  async deleteDocument(id: string): Promise<void> {
    await this.prisma.ndaDocument.delete({ where: { id } });
  }

  async getCurrentDocument(): Promise<NdaDocumentPayload> {
    const active = await this.prisma.ndaDocument.findFirst({
      where: { ndaType: NDA_TYPE_MUTUAL, isActive: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (active) {
      return { ...active, source: 'db' };
    }

    const enMarkdown = await this.readContentFile(NDA_FILES.en, true);
    const summaryPl = await this.readContentFile(NDA_FILES.summary.PL, false);
    const summaryDe = await this.readContentFile(NDA_FILES.summary.DE, false);
    const summaryNl = await this.readContentFile(NDA_FILES.summary.NL, false);
    const enHashSha256 = this.computeSha256(enMarkdown);
    return {
      ndaType: NDA_TYPE_MUTUAL,
      ndaVersion: NDA_VERSION,
      enMarkdown,
      summaryPl,
      summaryDe,
      summaryNl,
      enHashSha256,
      isActive: true,
      source: 'file',
    };
  }

  getSummaryForLanguage(doc: NdaDocumentPayload, language: NdaLanguage): string {
    if (language === 'PL' && doc.summaryPl) return doc.summaryPl;
    if (language === 'DE' && doc.summaryDe) return doc.summaryDe;
    if (language === 'NL' && doc.summaryNl) return doc.summaryNl;
    return doc.enMarkdown;
  }

  async getAcceptanceStatus(input: {
    orgId: string;
    counterpartyOrgId?: string | null;
  }): Promise<NdaAcceptancePayload | null> {
    const doc = await this.getCurrentDocument();
    const where: any = {
      orgId: input.orgId,
      ndaType: NDA_TYPE_MUTUAL,
      ndaVersion: doc.ndaVersion,
      enHashSha256: doc.enHashSha256,
    };
    if (input.counterpartyOrgId) {
      where.OR = [{ counterpartyOrgId: input.counterpartyOrgId }, { counterpartyOrgId: null }];
    }

    return this.prisma.ndaAcceptance.findFirst({ where, orderBy: { acceptedAt: 'desc' } });
  }

  async hasAccepted(input: { orgId: string; counterpartyOrgId?: string | null }): Promise<boolean> {
    const accepted = await this.getAcceptanceStatus(input);
    return Boolean(accepted);
  }

  async acceptMutualNda(input: {
    orgId: string;
    userId: string;
    typedName: string;
    typedRole: string;
    language: string;
    channel: NdaChannel;
    counterpartyOrgId?: string | null;
  }): Promise<NdaAcceptancePayload> {
    const doc = await this.getCurrentDocument();
    const language = this.normalizeLanguage(input.language);

    const existing = await this.getAcceptanceStatus({
      orgId: input.orgId,
      counterpartyOrgId: input.counterpartyOrgId ?? null,
    });
    if (existing) {
      return existing;
    }

    const now = new Date();
    const eventChannel = input.channel as Channel;
    const acceptance = await this.prisma.ndaAcceptance.create({
      data: {
        orgId: input.orgId,
        counterpartyOrgId: input.counterpartyOrgId ?? null,
        ndaType: NDA_TYPE_MUTUAL,
        ndaVersion: doc.ndaVersion,
        enHashSha256: doc.enHashSha256,
        acceptedByUserId: input.userId,
        acceptedAt: now,
        language,
        channel: input.channel,
        typedName: input.typedName,
        typedRole: input.typedRole,
      },
    });

    await this.events.emitEvent({
      type: EVENT_TYPES.NDA_ACCEPTED,
      occurredAt: now,
      orgId: input.orgId,
      actorUserId: input.userId,
      actorOrgId: input.orgId,
      subjectType: 'NDA',
      subjectId: acceptance.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: eventChannel,
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        ndaType: NDA_TYPE_MUTUAL,
        ndaVersion: doc.ndaVersion,
        enHashSha256: doc.enHashSha256,
        language,
        channel: eventChannel,
        typedName: input.typedName,
        typedRole: input.typedRole,
        acceptedByUserId: input.userId,
        acceptedAt: now.toISOString(),
        counterpartyOrgId: input.counterpartyOrgId ?? undefined,
      },
    });

    return acceptance;
  }

  computeSha256(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  }

  private async readContentFile(fileName: string, required: boolean): Promise<string> {
    const candidates = [
      path.resolve(process.cwd(), '..', 'docs', 'R1.0', 'legal', 'nda', fileName),
      path.resolve(process.cwd(), 'src', 'nda', 'content', fileName),
      path.resolve(process.cwd(), 'dist', 'nda', 'content', fileName),
    ];

    for (const candidate of candidates) {
      try {
        const buffer = await fs.readFile(candidate);
        return buffer.toString('utf8');
      } catch {
        continue;
      }
    }

    if (required) {
      throw new NotFoundException(`Missing NDA file: ${fileName}`);
    }
    return '';
  }
}

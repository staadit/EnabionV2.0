import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { PrismaService } from '../prisma.service';
import { IntentRedactionService } from '../intents/intent-redaction.service';

type ExportFormat = 'md' | 'pdf' | 'docx';

export type IntentExportModelL1 = {
  intentId: string;
  title: string | null;
  orgName: string;
  ownerName: string | null;
  clientName: string | null;
  pipelineStage: string;
  deadlineAt: string | null;
  goal: string | null;
  context: string | null;
  scope: string | null;
  kpis: string | null;
  risks: string | null;
  exportedAt: Date | string;
  hasL2: boolean;
  l2Redacted: boolean;
  ndaRequired: boolean;
};

const DEFAULT_TIME_ZONE = 'Europe/Warsaw';

@Injectable()
export class IntentExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redaction: IntentRedactionService,
  ) {}

  async buildModel(intentId: string, viewerOrgId: string): Promise<IntentExportModelL1> {
    const intent = await this.prisma.intent.findUnique({
      where: { id: intentId },
      select: {
        id: true,
        orgId: true,
        title: true,
        goal: true,
        context: true,
        scope: true,
        kpi: true,
        risks: true,
        stage: true,
        deadlineAt: true,
        client: true,
        ownerUserId: true,
      },
    });
    if (!intent) throw new BadRequestException('Intent not found');
    if (intent.orgId !== viewerOrgId) throw new ForbiddenException('Export limited to org');

    const [org, owner] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: intent.orgId },
        select: { name: true },
      }),
      intent.ownerUserId
        ? this.prisma.user.findUnique({
            where: { id: intent.ownerUserId },
            select: { email: true },
          })
        : null,
    ]);
    const redacted = await this.redaction.getExportView(intentId, viewerOrgId);

    return {
      intentId: intent.id,
      title: intent.title ?? redacted.intent.title ?? 'Intent',
      orgName: org?.name ?? 'Organization',
      ownerName: owner?.email ?? null,
      clientName: intent.client,
      pipelineStage: intent.stage,
      deadlineAt: intent.deadlineAt ? intent.deadlineAt.toISOString() : null,
      goal: intent.goal ?? redacted.intent.goal ?? null,
      context: intent.context ?? null,
      scope: intent.scope ?? null,
      kpis: intent.kpi ?? null,
      risks: intent.risks ?? null,
      exportedAt: new Date(),
      hasL2: redacted.intent.hasL2,
      l2Redacted: redacted.intent.l2Redacted,
      ndaRequired: redacted.intent.ndaRequired,
    };
  }

  private formatDate(value: Date | string | null, timeZone = DEFAULT_TIME_ZONE): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    try {
      const formatter = new Intl.DateTimeFormat('pl-PL', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23',
      });
      const parts = formatter.formatToParts(date);
      const lookup: Record<string, string> = {};
      for (const part of parts) {
        if (part.type !== 'literal') lookup[part.type] = part.value;
      }
      const { year, month, day, hour, minute, second } = lookup;
      if (year && month && day && hour && minute && second) {
        return `${day}-${month}-${year}, ${hour}:${minute}:${second}`;
      }
    } catch {
      // fall back
    }
    return date.toISOString();
  }

  renderMarkdown(model: IntentExportModelL1): string {
    this.assertNoForbiddenFields(model);
    const exportedAt = this.formatDate(model.exportedAt);
    const lines = [
      '# Intent export (L1-only)',
      '',
      '_Confidential notice: L1-only export; confidential (L2) details omitted._',
      '',
      `**Title:** ${model.title ?? '-'}`,
      `**Intent ID:** ${model.intentId}`,
      `**Organization:** ${model.orgName}`,
      `**Owner:** ${model.ownerName ?? '-'}`,
      `**Client:** ${model.clientName ?? '-'}`,
      `**Stage:** ${model.pipelineStage}`,
      `**Deadline:** ${model.deadlineAt ?? '-'}`,
      `**Exported at:** ${exportedAt}`,
      '',
      '## Goal',
      model.goal ?? '-',
      '',
      '## Context',
      model.context ?? '-',
      '',
      '## Scope',
      model.scope ?? '-',
      '',
      '## KPIs',
      model.kpis ?? '-',
      '',
      '## Risks',
      model.risks ?? '-',
      '',
      `L2 redacted: ${model.l2Redacted ? 'yes' : 'no'}. NDA required: ${
        model.ndaRequired ? 'yes' : 'no'
      }.`,
    ];
    return lines.join('\n');
  }

  async renderPdf(model: IntentExportModelL1): Promise<Buffer> {
    this.assertNoForbiddenFields(model);
    const exportedAt = this.formatDate(model.exportedAt);
    const doc = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', (err: Error) => {
      throw err;
    });

    doc.fontSize(18).text('Intent export (L1-only)', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#b42318').text('Confidential: L1-only export; L2 details omitted.');
    doc.moveDown();
    const add = (label: string, value: string | null) => {
      doc.fillColor('#000').fontSize(12).text(`${label}: ${value ?? '-'}`);
    };
    add('Title', model.title ?? '-');
    add('Intent ID', model.intentId);
    add('Organization', model.orgName);
    add('Owner', model.ownerName ?? '-');
    add('Client', model.clientName ?? '-');
    add('Stage', model.pipelineStage);
    add('Deadline', this.formatDate(model.deadlineAt));
    add('Exported at', exportedAt);
    doc.moveDown();
    doc.fontSize(14).text('Goal');
    doc.fontSize(12).text(model.goal ?? '-', { align: 'left' });
    doc.moveDown();
    doc.fontSize(14).text('Context');
    doc.fontSize(12).text(model.context ?? '-', { align: 'left' });
    doc.moveDown();
    doc.fontSize(14).text('Scope');
    doc.fontSize(12).text(model.scope ?? '-', { align: 'left' });
    doc.moveDown();
    doc.fontSize(14).text('KPIs');
    doc.fontSize(12).text(model.kpis ?? '-', { align: 'left' });
    doc.moveDown();
    doc.fontSize(14).text('Risks');
    doc.fontSize(12).text(model.risks ?? '-', { align: 'left' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#555').text(
      `L2 redacted: ${model.l2Redacted ? 'yes' : 'no'}. NDA required: ${model.ndaRequired ? 'yes' : 'no'}.`,
    );
    doc.end();
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  async renderDocx(model: IntentExportModelL1): Promise<Buffer> {
    this.assertNoForbiddenFields(model);
    const exportedAt = this.formatDate(model.exportedAt);
    const para = (label: string, value: string | null) =>
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `${label}: `, bold: true }),
          new TextRun({ text: value ?? '-' }),
        ],
      });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Intent export (L1-only)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: 'Confidential: L1-only export; L2 details omitted.',
              spacing: { after: 200 },
            }),
            para('Title', model.title ?? '-'),
            para('Intent ID', model.intentId),
            para('Organization', model.orgName),
            para('Owner', model.ownerName ?? '-'),
            para('Client', model.clientName ?? '-'),
            para('Stage', model.pipelineStage),
            para('Deadline', this.formatDate(model.deadlineAt)),
            para('Exported at', exportedAt),
            new Paragraph({ text: 'Goal', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: model.goal ?? '-' }),
            new Paragraph({ text: 'Context', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: model.context ?? '-' }),
            new Paragraph({ text: 'Scope', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: model.scope ?? '-' }),
            new Paragraph({ text: 'KPIs', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: model.kpis ?? '-' }),
            new Paragraph({ text: 'Risks', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: model.risks ?? '-' }),
            new Paragraph({
              text: `L2 redacted: ${model.l2Redacted ? 'yes' : 'no'}. NDA required: ${
                model.ndaRequired ? 'yes' : 'no'
              }.`,
            }),
          ],
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  private assertNoForbiddenFields(model: IntentExportModelL1) {
    if ((model as any).sourceTextRaw) {
      throw new BadRequestException('L2 content detected in export model');
    }
  }

  async render(format: ExportFormat, model: IntentExportModelL1): Promise<{ data: Buffer; contentType: string; extension: string }> {
    if (format === 'md') {
      const markdown = this.renderMarkdown(model);
      return {
        data: Buffer.from(markdown, 'utf8'),
        contentType: 'text/markdown; charset=utf-8',
        extension: 'md',
      };
    }
    if (format === 'pdf') {
      const buffer = await this.renderPdf(model);
      return {
        data: buffer,
        contentType: 'application/pdf',
        extension: 'pdf',
      };
    }
    if (format === 'docx') {
      const buffer = await this.renderDocx(model);
      return {
        data: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      };
    }
    throw new BadRequestException('Unsupported format');
  }
}

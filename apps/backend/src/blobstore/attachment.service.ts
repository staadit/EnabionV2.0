import * as crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BlobService } from './blob.service';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { AttachmentSource, ConfidentialityLevel } from './types';

export interface UploadAttachmentInput {
  orgId: string;
  intentId: string;
  source?: AttachmentSource;
  filename: string;
  contentType?: string;
  confidentiality: ConfidentialityLevel;
  buffer: Buffer;
  createdByUserId?: string;
}

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobService: BlobService,
    private readonly events: EventService,
  ) {}

  async uploadAttachment(input: UploadAttachmentInput) {
    const blob = await this.blobService.createBlob({
      orgId: input.orgId,
      buffer: input.buffer,
      filename: input.filename,
      contentType: input.contentType,
      confidentiality: input.confidentiality,
    });

    const attachment = await this.prisma.attachment.create({
      data: {
        orgId: input.orgId,
        intentId: input.intentId,
        source: (input.source || 'manual_upload') as any,
        filename: input.filename,
        blobId: blob.id,
        createdByUserId: input.createdByUserId,
      },
      include: { blob: true },
    });

    await this.emitUploadedEvent({
      attachment,
      actorUserId: input.createdByUserId,
    });
    return attachment;
  }

  async findByIdWithBlob(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { blob: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  async emitDownloadedEvent(input: {
    attachment: any;
    actorUserId?: string;
    via?: 'owner' | 'share_link' | 'system';
  }) {
    const intentId = input.attachment.intentId || 'unknown';
    await this.events.emitEvent({
      orgId: input.attachment.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.attachment.orgId,
      subjectType: 'ATTACHMENT',
      subjectId: input.attachment.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'api',
      correlationId: crypto.randomUUID(),
      occurredAt: new Date(),
      type: EVENT_TYPES.ATTACHMENT_DOWNLOADED,
      payload: {
        payloadVersion: 1,
        intentId,
        attachmentId: input.attachment.id,
        via: input.via || 'owner',
      },
    });
  }

  private async emitUploadedEvent(input: { attachment: any; actorUserId?: string }) {
    const intentId = input.attachment.intentId || 'unknown';
    await this.events.emitEvent({
      orgId: input.attachment.orgId,
      actorUserId: input.actorUserId,
      actorOrgId: input.attachment.orgId,
      subjectType: 'ATTACHMENT',
      subjectId: input.attachment.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'api',
      correlationId: crypto.randomUUID(),
      occurredAt: new Date(),
      type: EVENT_TYPES.ATTACHMENT_UPLOADED,
      payload: {
        payloadVersion: 1,
        intentId,
        attachmentId: input.attachment.id,
        filename: input.attachment.filename,
        sizeBytes: input.attachment.blob?.sizeBytes,
      },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentSource, ConfidentialityLevel } from './types';
import { PrismaService } from '../prisma.service';
import { BlobService } from './blob.service';

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
}

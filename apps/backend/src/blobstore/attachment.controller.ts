import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttachmentService, type AttachmentListItem } from './attachment.service';
import { AttachmentAccessPolicy } from './attachment.policy';
import { BlobService } from './blob.service';
import { NdaPolicy } from './nda.policy';
import { ConfidentialityLevel } from './types';

type UploadedFileType = {
  originalname: string;
  mimetype?: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
};

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1')
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly policy: AttachmentAccessPolicy,
    private readonly blobService: BlobService,
    private readonly ndaPolicy: NdaPolicy,
  ) {}

  @Post('intents/:intentId/attachments')
  @Roles('Owner', 'BD_AM')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @UploadedFile() file: UploadedFileType,
    @Body('confidentiality') confidentiality?: ConfidentialityLevel,
  ) {
    const user = this.requireUser(req);
    const orgId = user.orgId;
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const intent = await this.attachmentService.findIntent(intentId);
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }
    if (intent.orgId !== orgId) {
      throw new ForbiddenException('Cross-tenant upload not allowed');
    }
    this.policy.assertCanUpload({
      requestOrgId: orgId,
      resourceOrgId: intent.orgId,
    });

    const buffer = await this.toBuffer(file);
    const confidentialityLevel: ConfidentialityLevel = this.parseConfidentiality(
      confidentiality,
      intent.confidentialityLevel,
    );

    const attachment = await this.attachmentService.uploadAttachment({
      orgId,
      intentId,
      filename: file.originalname,
      contentType: file.mimetype || 'application/octet-stream',
      confidentiality: confidentialityLevel,
      buffer,
      createdByUserId: user.id,
    });

    return {
      attachmentId: attachment.id,
      blobId: attachment.blobId,
      confidentiality: attachment.blob.confidentiality,
    };
  }

  @Get('intents/:intentId/attachments')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async listIntentAttachments(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Query('ndaAccepted') _ndaAccepted?: string,
  ) {
    const user = this.requireUser(req);
    const intent = await this.attachmentService.findIntent(intentId);
    if (!intent) {
      throw new NotFoundException('Intent not found');
    }
    const attachments = await this.attachmentService.listIntentAttachments({
      intentId,
      orgId: intent.orgId,
    });

    const items = await this.mapAttachmentList(attachments, user.orgId, user.id);
    return { items };
  }

  @Get('intents/:intentId/attachments/:attachmentId/download')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async downloadIntentAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('attachmentId') attachmentId: string,
    @Query('ndaAccepted') _ndaAccepted?: string,
    @Query('asInline') asInline?: string,
  ) {
    const attachment = await this.attachmentService.findByIdWithBlob(attachmentId);
    if (attachment.intentId !== intentId) {
      throw new NotFoundException('Attachment not found');
    }
    return this.handleDownload(req, attachment, asInline);
  }

  @Get('attachments/:id')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async downloadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('ndaAccepted') _ndaAccepted?: string,
    @Query('asInline') asInline?: string,
  ) {
    const attachment = await this.attachmentService.findByIdWithBlob(id);
    return this.handleDownload(req, attachment, asInline);
  }

  private parseBool(value?: string): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private parseConfidentiality(
    value: string | undefined,
    fallback: ConfidentialityLevel,
  ): ConfidentialityLevel {
    if (value === 'L1' || value === 'L2' || value === 'L3') return value;
    return fallback;
  }

  private async handleDownload(
    req: AuthenticatedRequest,
    attachment: any,
    asInline?: string,
  ) {
    const user = this.requireUser(req);
    const orgId = user.orgId;
    const confidentiality = attachment.blob.confidentiality as ConfidentialityLevel;
    const ndaOk = await this.resolveNdaAccepted({
      requestOrgId: orgId,
      resourceOrgId: attachment.orgId,
      userId: user.id,
      intentId: attachment.intentId || undefined,
      confidentiality,
    });
    this.policy.assertCanDownload({
      requestOrgId: orgId,
      resourceOrgId: attachment.orgId,
      confidentiality,
      ndaAccepted: ndaOk,
    });

    const download = await this.blobService.getBlobStream(attachment.blobId, attachment.orgId);
    await this.attachmentService.emitDownloadedEvent({
      attachment,
      actorUserId: user.id,
      actorOrgId: user.orgId,
      via: 'owner',
    });

    if (download.signedUrl) {
      return {
        signedUrl: download.signedUrl,
        expiresAt: download.expiresAt?.toISOString(),
        contentType: attachment.blob?.contentType,
      };
    }

    const dispositionType = this.parseBool(asInline) ? 'inline' : 'attachment';
    return new StreamableFile(download.stream as any, {
      disposition: `${dispositionType}; filename="${attachment.filename}"`,
      type: attachment.blob?.contentType,
    });
  }

  private async resolveNdaAccepted(input: {
    requestOrgId: string;
    resourceOrgId: string;
    userId: string;
    intentId?: string;
    confidentiality: ConfidentialityLevel;
  }): Promise<boolean> {
    return this.ndaPolicy.canAccess({
      requestOrgId: input.requestOrgId,
      resourceOrgId: input.resourceOrgId,
      userId: input.userId,
      intentId: input.intentId,
      confidentiality: input.confidentiality,
    });
  }

  private async mapAttachmentList(
    attachments: AttachmentListItem[],
    requestOrgId: string,
    userId: string,
  ) {
    const mapped = await Promise.all(
      attachments.map(async (attachment) => {
        const confidentiality = attachment.blob.confidentiality as ConfidentialityLevel;
        const ndaOk = await this.resolveNdaAccepted({
          requestOrgId,
          resourceOrgId: attachment.orgId,
          userId,
          intentId: attachment.intentId || undefined,
          confidentiality,
        });
        const canDownload = this.policy.canDownload({
          requestOrgId,
          resourceOrgId: attachment.orgId,
          confidentiality,
          ndaAccepted: ndaOk,
        });
        return {
          id: attachment.id,
          originalName: attachment.filename,
          mimeType: attachment.blob?.contentType ?? 'application/octet-stream',
          sizeBytes: attachment.blob?.sizeBytes ?? 0,
          sha256Hex: attachment.blob?.sha256 ?? '',
          confidentialityLevel: confidentiality,
          createdAt: attachment.createdAt.toISOString(),
          uploadedBy: attachment.uploadedBy
            ? {
                id: attachment.uploadedBy.id,
                email: attachment.uploadedBy.email,
                name: null,
              }
            : null,
          canDownload,
        };
      }),
    );
    return mapped;
  }

  private async toBuffer(file: UploadedFileType): Promise<Buffer> {
    if (file.buffer) return file.buffer;

    const stream = file.stream;
    if (!stream) {
      throw new BadRequestException('file stream missing');
    }
    const chunks: Buffer[] = [];
    return await new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}

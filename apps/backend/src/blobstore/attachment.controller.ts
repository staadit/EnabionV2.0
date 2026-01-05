import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AttachmentService } from './attachment.service';
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

@UseGuards(AuthGuard)
@Controller('v1')
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly policy: AttachmentAccessPolicy,
    private readonly blobService: BlobService,
    private readonly ndaPolicy: NdaPolicy,
  ) {}

  @Post('intents/:intentId/attachments')
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
    this.policy.assertCanUpload({
      requestOrgId: orgId,
      resourceOrgId: orgId,
      role: user.role,
    });

    const buffer = await this.toBuffer(file);
    const confidentialityLevel: ConfidentialityLevel = this.parseConfidentiality(confidentiality);

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

  @Get('attachments/:id')
  async downloadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('ndaAccepted') ndaAccepted?: string,
    @Query('asInline') asInline?: string,
  ) {
    const user = this.requireUser(req);
    const orgId = user.orgId;

    const attachment = await this.attachmentService.findByIdWithBlob(id);
    const ndaOk = await this.ndaPolicy.canAccess({
      orgId,
      userId: user.id,
      intentId: attachment.intentId || undefined,
      confidentiality: attachment.blob.confidentiality as ConfidentialityLevel,
      assumedAccepted: this.parseBool(ndaAccepted),
    });
    this.policy.assertCanDownload({
      requestOrgId: orgId,
      resourceOrgId: attachment.orgId,
      role: user.role,
      confidentiality: attachment.blob.confidentiality as ConfidentialityLevel,
      ndaAccepted: ndaOk,
    });

    const download = await this.blobService.getBlobStream(attachment.blobId, orgId);
    await this.attachmentService.emitDownloadedEvent({
      attachment,
      actorUserId: user.id,
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

  private parseBool(value?: string): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private parseConfidentiality(value?: string): ConfidentialityLevel {
    if (value === 'L2' || value === 'L3') return value;
    return 'L1';
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

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Blob as BlobModel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { BlobConfig } from './blob.config';
import { BlobStore, BlobStoreSignedUrlOutput } from './blobstore.interface';
import { CryptoEnvelope, EncryptResult } from './crypto-envelope';
import { ConfidentialityLevel } from './types';

export const BLOBSTORE_TOKEN = 'BLOBSTORE_TOKEN';
export const BLOBCONFIG_TOKEN = 'BLOBCONFIG_TOKEN';

export interface CreateBlobInput {
  orgId: string;
  buffer: Buffer;
  filename?: string;
  contentType?: string;
  confidentiality: ConfidentialityLevel;
}

export interface GetBlobResult {
  blob: BlobModel;
  stream?: NodeJS.ReadableStream;
  signedUrl?: string;
  expiresAt: Date;
}

@Injectable()
export class BlobService {
  private readonly crypto: CryptoEnvelope;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BLOBSTORE_TOKEN) private readonly store: BlobStore,
    @Inject(BLOBCONFIG_TOKEN) private readonly config: BlobConfig,
  ) {
    this.crypto = new CryptoEnvelope(config.masterKeyB64, config.encryptionKeyId || 'master-v1');
  }

  private normalizeContentType(contentType?: string): string {
    const base = (contentType || 'application/octet-stream').split(';')[0].trim();
    return base || 'application/octet-stream';
  }

  private getDownloadTtlSeconds(): number {
    const ttl = this.config.downloadUrlTtlSeconds ?? 300;
    const normalized = Number.isFinite(ttl) && ttl > 0 ? ttl : 300;
    const clamped = Math.max(60, Math.min(normalized, 3600));
    return clamped;
  }

  private buildObjectKey(orgId: string, blobId: string, filename?: string): string {
    const safeName = filename
      ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
      : 'blob.bin';
    return path.posix.join(orgId, blobId, safeName);
  }

  private hashSha256(buffer: Buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private enforceUploadGuards(buffer: Buffer, contentType: string): string {
    const normalized = this.normalizeContentType(contentType).toLowerCase();
    if (this.config.maxUploadBytes && buffer.length > this.config.maxUploadBytes) {
      throw new BadRequestException('Attachment too large');
    }
    if (
      this.config.allowedContentTypes &&
      this.config.allowedContentTypes.length > 0 &&
      !this.config.allowedContentTypes.includes(normalized)
    ) {
      throw new BadRequestException('Content type not allowed');
    }
    return normalized;
  }

  async createBlob(input: CreateBlobInput): Promise<BlobModel> {
    const contentType = this.normalizeContentType(input.contentType);
    const enforcedType = this.enforceUploadGuards(input.buffer, contentType);

    const blobId = crypto.randomUUID();
    const objectKey = this.buildObjectKey(input.orgId, blobId, input.filename);
    const shouldEncrypt = this.crypto.shouldEncrypt(input.confidentiality);
    const sha = this.hashSha256(input.buffer);

    let payload = input.buffer;
    let envelope: EncryptResult | null = null;
    if (shouldEncrypt) {
      envelope = this.crypto.encrypt(input.buffer);
      payload = envelope.ciphertext;
    }

    await this.store.put({
      objectKey,
      data: payload,
      contentType: enforcedType,
    });

    const blob = await this.prisma.blob.create({
      data: {
        id: blobId,
        orgId: input.orgId,
        storageDriver: this.store.driver as any,
        objectKey,
        sizeBytes: input.buffer.length,
        sha256: sha,
        contentType: enforcedType,
        confidentiality: input.confidentiality as any,
        encrypted: shouldEncrypt,
        encryptionAlg: envelope?.alg,
        encryptionKeyId: envelope?.keyId,
        encryptionIvB64: envelope?.ivB64,
        encryptionTagB64: envelope?.tagB64,
      },
    });
    return blob;
  }

  private async maybeSignedUrl(
    blob: BlobModel,
    expiresInSeconds: number,
  ): Promise<BlobStoreSignedUrlOutput | null> {
    const storeWithSigning = this.store as BlobStore & {
      getSignedUrl?: (objectKey: string, expiresInSeconds: number) => Promise<BlobStoreSignedUrlOutput>;
    };
    if (!storeWithSigning.getSignedUrl || blob.encrypted) {
      return null;
    }
    return storeWithSigning.getSignedUrl(blob.objectKey, expiresInSeconds);
  }

  async getBlobStream(blobId: string, orgContext?: string): Promise<GetBlobResult> {
    const blob = await this.prisma.blob.findUnique({ where: { id: blobId } });
    if (!blob) {
      throw new NotFoundException('Blob not found');
    }
    if (orgContext && blob.orgId !== orgContext) {
      throw new ForbiddenException('Cross-tenant blob access denied');
    }
    if (blob.storageDriver !== (this.store.driver as any)) {
      throw new BadRequestException('Blob stored with different driver; check configuration');
    }

    const expiresInSeconds = this.getDownloadTtlSeconds();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const signed = await this.maybeSignedUrl(blob, expiresInSeconds);
    if (signed) {
      return { blob, signedUrl: signed.url, expiresAt: signed.expiresAt ?? expiresAt };
    }

    const { stream } = await this.store.get(blob.objectKey);
    if (!blob.encrypted) {
      return { blob, stream, expiresAt };
    }
    if (!blob.encryptionIvB64 || !blob.encryptionTagB64) {
      throw new Error('Missing encryption metadata');
    }

    const decryptedStream = this.crypto.decryptStream(
      stream,
      blob.encryptionIvB64,
      blob.encryptionTagB64,
    );
    return { blob, stream: decryptedStream, expiresAt };
  }

  async deleteBlob(blobId: string, orgContext?: string): Promise<void> {
    const blob = await this.prisma.blob.findUnique({ where: { id: blobId } });
    if (!blob) return;
    if (orgContext && blob.orgId !== orgContext) {
      throw new ForbiddenException('Cross-tenant blob delete denied');
    }
    await this.store.delete(blob.objectKey);
    await this.prisma.blob.delete({ where: { id: blobId } });
  }
}

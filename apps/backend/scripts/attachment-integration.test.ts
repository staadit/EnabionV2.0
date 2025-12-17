import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { AttachmentController } from '../src/blobstore/attachment.controller';
import { AttachmentAccessPolicy } from '../src/blobstore/attachment.policy';
import { AttachmentService } from '../src/blobstore/attachment.service';
import { BlobService } from '../src/blobstore/blob.service';
import { LocalBlobStore } from '../src/blobstore/local-blobstore';
import { NdaPolicy } from '../src/blobstore/nda.policy';
import { ConfidentialityLevel } from '../src/blobstore/types';

type BlobRecord = {
  id: string;
  orgId: string;
  storageDriver: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
  confidentiality: ConfidentialityLevel;
  encrypted: boolean;
  encryptionAlg?: string | null;
  encryptionKeyId?: string | null;
  encryptionIvB64?: string | null;
  encryptionTagB64?: string | null;
};

type AttachmentRecord = {
  id: string;
  orgId: string;
  intentId?: string | null;
  source: string;
  filename: string;
  blobId: string;
  createdByUserId?: string | null;
  blob?: BlobRecord;
};

class MockPrismaService {
  public blobs: BlobRecord[] = [];
  public attachments: AttachmentRecord[] = [];

  blob = {
    create: async (args: any) => {
      const record = { id: crypto.randomUUID(), ...args.data } as BlobRecord;
      this.blobs.push(record);
      return record;
    },
    findUnique: async (args: any) => {
      return this.blobs.find((b) => b.id === args.where.id) || null;
    },
  };

  attachment = {
    create: async (args: any) => {
      const record = { id: crypto.randomUUID(), ...args.data } as AttachmentRecord;
      const blob = this.blobs.find((b) => b.id === record.blobId);
      record.blob = blob || undefined;
      this.attachments.push(record);
      return record;
    },
    findUnique: async (args: any) => {
      const found = this.attachments.find((a) => a.id === args.where.id);
      if (!found) return null;
      if (args.include?.blob) {
        const blob = this.blobs.find((b) => b.id === found.blobId);
        return { ...found, blob };
      }
      return found;
    },
  };
}

function assert(cond: any, msg: string) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function run() {
  const tmpRoot = path.resolve(process.cwd(), 'tmp', 'blobstore-int');
  await fs.promises.rm(tmpRoot, { recursive: true, force: true });
  const prisma = new MockPrismaService();
  const blobService = new BlobService(prisma as any, new LocalBlobStore(tmpRoot), {
    driver: 'local',
    localRoot: tmpRoot,
    masterKeyB64: Buffer.alloc(32, 1).toString('base64'),
    encryptionKeyId: 'master-v1',
  });
  const attachmentService = new AttachmentService(prisma as any, blobService);
  const policy = new AttachmentAccessPolicy();
  const ndaPolicy = new NdaPolicy();
  const controller = new AttachmentController(attachmentService, policy, blobService, ndaPolicy);

  // Upload L1
  const uploadRes: any = await controller.uploadAttachment(
    'intent-1',
    {
      originalname: 'test.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello-world'),
    } as any,
    'org-1',
    'Owner',
    'user-1',
    undefined,
  );
  assert(uploadRes.attachmentId, 'attachmentId missing');

  // Download L1 from same org succeeds
  const downloadRes: any = await controller.downloadAttachment(
    uploadRes.attachmentId,
    'org-1',
    'Viewer',
    undefined,
    undefined,
  );
  const roundtrip = await streamToBuffer(downloadRes.getStream());
  assert(roundtrip.toString() === 'hello-world', 'roundtrip mismatch');

  // Cross-tenant forbidden
  let threw = false;
  try {
    await controller.downloadAttachment(uploadRes.attachmentId, 'other-org', 'Viewer', undefined, undefined);
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'cross-tenant download should be forbidden');

  // L2 requires NDA
  const uploadL2: any = await controller.uploadAttachment(
    'intent-2',
    {
      originalname: 'secret.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('top-secret'),
    } as any,
    'org-1',
    'Owner',
    'user-1',
    'L2',
  );
  threw = false;
  try {
    await controller.downloadAttachment(uploadL2.attachmentId, 'org-1', 'Viewer', undefined, undefined);
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'L2 without NDA should be forbidden');

  const okDownload: any = await controller.downloadAttachment(
    uploadL2.attachmentId,
    'org-1',
    'Viewer',
    'true',
    undefined,
  );
  const l2Buffer = await streamToBuffer(okDownload.getStream());
  assert(l2Buffer.toString() === 'top-secret', 'L2 decrypt mismatch');

  // eslint-disable-next-line no-console
  console.log('Attachment integration tests passed.');
}

run();

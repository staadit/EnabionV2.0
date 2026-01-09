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
import { EventService } from '../src/events/event.service';
import { EVENT_TYPES } from '../src/events/event-registry';

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
  createdAt?: Date;
  blob?: BlobRecord;
};

class MockPrismaService {
  public blobs: BlobRecord[] = [];
  public attachments: AttachmentRecord[] = [];
  public intents: Array<{ id: string; orgId: string; confidentialityLevel: ConfidentialityLevel }> = [];
  public users: Array<{ id: string; email: string }> = [];

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
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        ...args.data,
      } as AttachmentRecord;
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
    findMany: async (args: any) => {
      const filtered = this.attachments.filter((attachment) => {
        if (args.where?.intentId && attachment.intentId !== args.where.intentId) {
          return false;
        }
        if (args.where?.orgId && attachment.orgId !== args.where.orgId) {
          return false;
        }
        return true;
      });
      if (args.orderBy?.createdAt) {
        const direction = args.orderBy.createdAt === 'desc' ? -1 : 1;
        filtered.sort((a, b) => {
          const left = a.createdAt?.getTime() || 0;
          const right = b.createdAt?.getTime() || 0;
          return direction * (left - right);
        });
      }
      if (args.include?.blob) {
        return filtered.map((attachment) => {
          const blob = this.blobs.find((b) => b.id === attachment.blobId);
          return { ...attachment, blob };
        });
      }
      return filtered;
    },
  };

  intent = {
    findUnique: async (args: any) => {
      return this.intents.find((intent) => intent.id === args.where.id) || null;
    },
  };

  user = {
    findMany: async (args: any) => {
      const ids = new Set(args.where?.id?.in ?? []);
      return this.users.filter((user) => ids.has(user.id));
    },
  };
}

class MockEventService extends EventService {
  public emitted: any[] = [];
  constructor() {
    // @ts-expect-error - EventService expects prisma, we bypass for tests
    super({});
  }
  async emitEvent(event: any): Promise<any> {
    this.emitted.push(event);
    return {
      ...event,
      eventId: event.eventId || 'evt_test',
      schemaVersion: 1,
      recordedAt: new Date(),
      payload: event.payload,
    };
  }
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
  prisma.intents.push(
    { id: 'intent-1', orgId: 'org-1', confidentialityLevel: 'L1' },
    { id: 'intent-2', orgId: 'org-1', confidentialityLevel: 'L1' },
  );
  prisma.users.push(
    { id: 'user-1', email: 'owner@example.com' },
    { id: 'user-2', email: 'viewer@example.com' },
    { id: 'user-3', email: 'other@example.com' },
  );
  const eventService = new MockEventService();
  const blobService = new BlobService(prisma as any, new LocalBlobStore(tmpRoot), {
    driver: 'local',
    localRoot: tmpRoot,
    masterKeyB64: Buffer.alloc(32, 1).toString('base64'),
    encryptionKeyId: 'master-v1',
  });
  const attachmentService = new AttachmentService(prisma as any, blobService, eventService as any);
  const policy = new AttachmentAccessPolicy();
  const ndaPolicy = new NdaPolicy();
  const controller = new AttachmentController(attachmentService, policy, blobService, ndaPolicy);
  const ownerReq = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      orgId: 'org-1',
      role: 'Owner',
    },
  } as any;
  const viewerReq = {
    user: {
      id: 'user-2',
      email: 'viewer@example.com',
      orgId: 'org-1',
      role: 'Viewer',
    },
  } as any;
  const otherOrgReq = {
    user: {
      id: 'user-3',
      email: 'other@example.com',
      orgId: 'other-org',
      role: 'Viewer',
    },
  } as any;

  // Upload L1
  const uploadRes: any = await controller.uploadAttachment(
    ownerReq,
    'intent-1',
    {
      originalname: 'test.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello-world'),
    } as any,
    undefined,
  );
  assert(uploadRes.attachmentId, 'attachmentId missing');
  const uploadEvent = eventService.emitted.find((e) => e.type === EVENT_TYPES.ATTACHMENT_UPLOADED);
  assert(
    uploadEvent && uploadEvent.payload?.filename === 'test.txt',
    'upload event should be emitted',
  );

  assert(
    eventService.emitted.some((e) => e.type === EVENT_TYPES.ATTACHMENT_UPLOADED),
    'upload event should be emitted',
  );

  const listOwner: any = await controller.listIntentAttachments(ownerReq, 'intent-1', undefined);
  assert(listOwner.items?.length === 1, 'list should return attachment');
  assert(listOwner.items[0].canDownload === true, 'owner can download L1');

  const listOther: any = await controller.listIntentAttachments(otherOrgReq, 'intent-1', undefined);
  assert(listOther.items?.length === 1, 'cross-tenant list should return attachment');
  assert(listOther.items[0].canDownload === true, 'cross-tenant L1 should be downloadable');

  // Download L1 from same org succeeds
  const downloadRes: any = await controller.downloadAttachment(
    viewerReq,
    uploadRes.attachmentId,
    undefined,
    undefined,
  );
  const roundtrip = await streamToBuffer(downloadRes.getStream());
  assert(roundtrip.toString() === 'hello-world', 'roundtrip mismatch');

  // Cross-tenant L1 allowed
  const crossDownload: any = await controller.downloadAttachment(
    otherOrgReq,
    uploadRes.attachmentId,
    undefined,
    undefined,
  );
  const crossBuffer = await streamToBuffer(crossDownload.getStream());
  assert(crossBuffer.toString() === 'hello-world', 'cross-tenant L1 mismatch');

  // L2 requires NDA
  const uploadL2: any = await controller.uploadAttachment(
    ownerReq,
    'intent-2',
    {
      originalname: 'secret.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('top-secret'),
    } as any,
    'L2',
  );
  const okDownloadSameOrg: any = await controller.downloadAttachment(
    viewerReq,
    uploadL2.attachmentId,
    undefined,
  );
  const l2Buffer = await streamToBuffer(okDownloadSameOrg.getStream());
  assert(l2Buffer.toString() === 'top-secret', 'L2 decrypt mismatch');

  const listOtherL2: any = await controller.listIntentAttachments(otherOrgReq, 'intent-2', undefined);
  assert(listOtherL2.items?.length === 1, 'cross-tenant list should include L2');
  assert(listOtherL2.items[0].canDownload === false, 'cross-tenant L2 should be locked');

  let threw = false;
  try {
    await controller.downloadAttachment(otherOrgReq, uploadL2.attachmentId, undefined, undefined);
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'cross-tenant L2 without NDA should be forbidden');

  const okDownload: any = await controller.downloadAttachment(
    otherOrgReq,
    uploadL2.attachmentId,
    'true',
    undefined,
  );
  const l2CrossBuffer = await streamToBuffer(okDownload.getStream());
  assert(l2CrossBuffer.toString() === 'top-secret', 'cross-tenant L2 decrypt mismatch');

  const listOtherL2Ok: any = await controller.listIntentAttachments(otherOrgReq, 'intent-2', 'true');
  assert(listOtherL2Ok.items[0].canDownload === true, 'NDA should unlock L2 download');
  const downloadEvents = eventService.emitted.filter(
    (e) => e.type === EVENT_TYPES.ATTACHMENT_DOWNLOADED,
  );
  assert(downloadEvents.length >= 2, 'download events should be emitted');
  assert(downloadEvents.every((e) => e.payload?.via === 'owner'), 'via should be owner');

  // eslint-disable-next-line no-console
  console.log('Attachment integration tests passed.');
}

run();

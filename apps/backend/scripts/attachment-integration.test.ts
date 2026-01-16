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
import { NdaService } from '../src/nda/nda.service';

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
  public ndaDocuments: Array<{
    id: string;
    ndaType: string;
    ndaVersion: string;
    enMarkdown: string;
    summaryPl?: string | null;
    summaryDe?: string | null;
    summaryNl?: string | null;
    enHashSha256: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  public ndaAcceptances: Array<{
    id: string;
    orgId: string;
    counterpartyOrgId?: string | null;
    ndaType: string;
    ndaVersion: string;
    enHashSha256: string;
    acceptedByUserId: string;
    acceptedAt: Date;
    language: string;
    channel: string;
    typedName: string;
    typedRole: string;
    createdAt: Date;
  }> = [];

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

  ndaDocument = {
    findFirst: async (args: any) => {
      const filtered = this.ndaDocuments.filter((doc) => {
        if (args.where?.ndaType && doc.ndaType !== args.where.ndaType) return false;
        if (args.where?.isActive !== undefined && doc.isActive !== args.where.isActive) return false;
        return true;
      });
      if (!filtered.length) return null;
      return filtered[0];
    },
  };

  ndaAcceptance = {
    findFirst: async (args: any) => {
      const candidates = this.ndaAcceptances.filter((acc) => {
        if (args.where?.orgId && acc.orgId !== args.where.orgId) return false;
        if (args.where?.ndaType && acc.ndaType !== args.where.ndaType) return false;
        if (args.where?.ndaVersion && acc.ndaVersion !== args.where.ndaVersion) return false;
        if (args.where?.enHashSha256 && acc.enHashSha256 !== args.where.enHashSha256) return false;
        if (args.where?.counterpartyOrgId !== undefined) {
          return acc.counterpartyOrgId === args.where.counterpartyOrgId;
        }
        return true;
      });
      if (args.where?.OR) {
        const orMatches = candidates.filter((acc) =>
          args.where.OR.some((clause: any) => acc.counterpartyOrgId === clause.counterpartyOrgId),
        );
        return orMatches[0] ?? null;
      }
      return candidates[0] ?? null;
    },
    create: async (args: any) => {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), ...args.data };
      this.ndaAcceptances.push(record);
      return record;
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
  const baseRoot = process.env.BLOBSTORE_TEST_ROOT
    ? path.resolve(process.env.BLOBSTORE_TEST_ROOT)
    : path.resolve(process.cwd(), 'tmp');
  const tmpRoot = path.resolve(baseRoot, 'blobstore-int');
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
  const ndaService = new NdaService(prisma as any, eventService as any);
  const ndaPolicy = new NdaPolicy(ndaService);
  const controller = new AttachmentController(
    attachmentService,
    policy,
    blobService,
    ndaPolicy,
    eventService as any,
  );
  const currentDoc = await ndaService.getCurrentDocument();
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

  const listOwner: any = await controller.listIntentAttachments(ownerReq, 'intent-1');
  assert(listOwner.items?.length === 1, 'list should return attachment');
  assert(listOwner.items[0].canDownload === true, 'owner can download L1');

  const listOther: any = await controller.listIntentAttachments(otherOrgReq, 'intent-1');
  assert(listOther.items?.length === 1, 'cross-tenant list should return attachment');
  assert(listOther.items[0].canDownload === true, 'cross-tenant L1 should be downloadable');

  // Download L1 from same org succeeds
  const downloadRes: any = await controller.downloadAttachment(
    viewerReq,
    uploadRes.attachmentId,
  );
  const roundtrip = await streamToBuffer(downloadRes.getStream());
  assert(roundtrip.toString() === 'hello-world', 'roundtrip mismatch');

  // Cross-tenant L1 allowed
  const crossDownload: any = await controller.downloadAttachment(
    otherOrgReq,
    uploadRes.attachmentId,
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
  );
  const l2Buffer = await streamToBuffer(okDownloadSameOrg.getStream());
  assert(l2Buffer.toString() === 'top-secret', 'L2 decrypt mismatch');

  const listOtherL2: any = await controller.listIntentAttachments(otherOrgReq, 'intent-2');
  assert(listOtherL2.items?.length === 1, 'cross-tenant list should include L2');
  assert(listOtherL2.items[0].canDownload === false, 'cross-tenant L2 should be locked');

  let threw = false;
  try {
    await controller.downloadAttachment(otherOrgReq, uploadL2.attachmentId);
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'cross-tenant L2 without NDA should be forbidden');

  prisma.ndaAcceptances.push({
    id: crypto.randomUUID(),
    orgId: 'other-org',
    counterpartyOrgId: 'org-1',
    ndaType: 'MUTUAL',
    ndaVersion: currentDoc.ndaVersion,
    enHashSha256: currentDoc.enHashSha256,
    acceptedByUserId: 'user-3',
    acceptedAt: new Date(),
    language: 'EN',
    channel: 'ui',
    typedName: 'Other User',
    typedRole: 'Viewer',
    createdAt: new Date(),
  });

  threw = false;
  try {
    await controller.downloadAttachment(otherOrgReq, uploadL2.attachmentId);
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'cross-tenant L2 without mutual NDA should be forbidden');

  prisma.ndaAcceptances.push({
    id: crypto.randomUUID(),
    orgId: 'org-1',
    counterpartyOrgId: 'other-org',
    ndaType: 'MUTUAL',
    ndaVersion: currentDoc.ndaVersion,
    enHashSha256: currentDoc.enHashSha256,
    acceptedByUserId: 'user-1',
    acceptedAt: new Date(),
    language: 'EN',
    channel: 'ui',
    typedName: 'Owner User',
    typedRole: 'Owner',
    createdAt: new Date(),
  });

  const okDownload: any = await controller.downloadAttachment(
    otherOrgReq,
    uploadL2.attachmentId,
  );
  const l2CrossBuffer = await streamToBuffer(okDownload.getStream());
  assert(l2CrossBuffer.toString() === 'top-secret', 'cross-tenant L2 decrypt mismatch');

  const listOtherL2Ok: any = await controller.listIntentAttachments(otherOrgReq, 'intent-2');
  assert(listOtherL2Ok.items[0].canDownload === true, 'mutual NDA should unlock L2 download');
  const downloadEvents = eventService.emitted.filter(
    (e) => e.type === EVENT_TYPES.ATTACHMENT_DOWNLOADED,
  );
  assert(downloadEvents.length >= 2, 'download events should be emitted');
  assert(downloadEvents.every((e) => e.payload?.via === 'owner'), 'via should be owner');

  // eslint-disable-next-line no-console
  console.log('Attachment integration tests passed.');
}

run();

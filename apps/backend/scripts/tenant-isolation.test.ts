import * as crypto from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { AttachmentService } from '../src/blobstore/attachment.service';
import { BLOBSTORE_TOKEN } from '../src/blobstore/blob.service';
import type { BlobStore, BlobStoreGetOutput, BlobStorePutInput } from '../src/blobstore/blobstore.interface';
import { PrismaService } from '../src/prisma.service';

type BlobRecord = {
  id: string;
  orgId: string;
  storageDriver: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
  confidentiality: string;
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
  public events: any[] = [];
  public lastEventFindManyArgs: any;
  private readonly ndaDoc = {
    id: 'nda-doc-1',
    ndaType: 'MUTUAL',
    ndaVersion: 'Enabion_mutual_nda_v0.1_en',
    enMarkdown: 'NDA',
    summaryPl: null,
    summaryDe: null,
    summaryNl: null,
    enHashSha256: '0'.repeat(64),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  blob = {
    create: async (args: any) => {
      const record = { ...args.data } as BlobRecord;
      record.id = record.id || crypto.randomUUID();
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
      if (args.include?.blob) {
        return { ...record, blob };
      }
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

  event = {
    create: async (args: any) => {
      this.events.push(args.data);
      return args.data;
    },
    findMany: async (args: any) => {
      this.lastEventFindManyArgs = args;
      return this.events.filter((evt) => evt.orgId === args.where?.orgId);
    },
  };

  ndaDocument = {
    findFirst: async () => this.ndaDoc,
  };

  ndaAcceptance = {
    findFirst: async () => null,
  };
}

class MemoryBlobStore implements BlobStore {
  driver = 'local' as const;
  private readonly store = new Map<string, Buffer>();

  async put(input: BlobStorePutInput): Promise<void> {
    const buffer = Buffer.isBuffer(input.data) ? input.data : await streamToBuffer(input.data);
    this.store.set(input.objectKey, buffer);
  }

  async get(objectKey: string): Promise<BlobStoreGetOutput> {
    const buffer = this.store.get(objectKey);
    if (!buffer) {
      throw new Error(`Missing blob payload for ${objectKey}`);
    }
    return { stream: Readable.from(buffer) };
  }

  async delete(objectKey: string): Promise<void> {
    this.store.delete(objectKey);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function requestBytes(url: string, headers: Record<string, string>) {
  const fetchFn = (globalThis as any).fetch as typeof fetch | undefined;
  if (typeof fetchFn === 'function') {
    const res = await fetchFn(url, { headers });
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, body: buffer };
  }

  return await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(
      url,
      {
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () =>
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  process.env.BLOB_ENC_MASTER_KEY = Buffer.alloc(32, 3).toString('base64');
  const prisma = new MockPrismaService();
  const blobStore = new MemoryBlobStore();
  const authService = {
    getCookieName: () => 'enabion_session',
    validateSession: async (token: string) => {
      if (token === 'tokenA') {
        return {
          user: { id: 'user-a', orgId: 'org-a', role: 'Owner', email: 'a@test' },
          sessionId: 'session-a',
        };
      }
      if (token === 'tokenB') {
        return {
          user: { id: 'user-b', orgId: 'org-b', role: 'Owner', email: 'b@test' },
          sessionId: 'session-b',
        };
      }
      throw new Error('Invalid session');
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(AuthService)
    .useValue(authService)
    .overrideProvider(BLOBSTORE_TOKEN)
    .useValue(blobStore)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0);

  const address = app.getHttpServer().address() as AddressInfo | string | null;
  const port =
    typeof address === 'string'
      ? Number(address.split(':').pop())
      : address?.port;
  assert(port, 'Failed to bind to an HTTP port');
  const baseUrl = `http://127.0.0.1:${port}`;

  const attachmentService = moduleRef.get(AttachmentService);
  const blobA = Buffer.from('blob-a');
  const blobB = Buffer.from('blob-b');

  const attachmentA = await attachmentService.uploadAttachment({
    orgId: 'org-a',
    intentId: 'intent-a',
    filename: 'a.txt',
    contentType: 'text/plain',
    confidentiality: 'L2',
    buffer: blobA,
    createdByUserId: 'user-a',
  });
  const attachmentB = await attachmentService.uploadAttachment({
    orgId: 'org-b',
    intentId: 'intent-b',
    filename: 'b.txt',
    contentType: 'text/plain',
    confidentiality: 'L2',
    buffer: blobB,
    createdByUserId: 'user-b',
  });

  const resA = await requestBytes(`${baseUrl}/v1/attachments/${attachmentA.id}`, {
    cookie: 'enabion_session=tokenA',
  });
  assert(resA.status === 200, 'org-a should download its own attachment');
  assert(resA.body.equals(blobA), 'attachmentA payload mismatch');

  const resForbidden = await requestBytes(`${baseUrl}/v1/attachments/${attachmentB.id}`, {
    cookie: 'enabion_session=tokenA',
  });
  assert(resForbidden.status === 403, 'org-a should not access org-b attachment');

  const resSpoof = await requestBytes(
    `${baseUrl}/v1/attachments/${attachmentB.id}?orgId=org-b&role=Owner&userId=user-b`,
    {
      cookie: 'enabion_session=tokenA',
    },
  );
  assert(resSpoof.status === 403, 'spoofed query params must not bypass tenant isolation');

  const resB = await requestBytes(`${baseUrl}/v1/attachments/${attachmentB.id}`, {
    cookie: 'enabion_session=tokenB',
  });
  assert(resB.status === 200, 'org-b should download its own attachment');
  assert(resB.body.equals(blobB), 'attachmentB payload mismatch');

  await app.close();

  // eslint-disable-next-line no-console
  console.log('Tenant isolation attachment HTTP tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

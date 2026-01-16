import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AttachmentAccessPolicy } from '../src/blobstore/attachment.policy';
import { CryptoEnvelope } from '../src/blobstore/crypto-envelope';
import { BlobService } from '../src/blobstore/blob.service';
import { BlobStore, BlobStoreGetOutput } from '../src/blobstore/blobstore.interface';
import { LocalBlobStore } from '../src/blobstore/local-blobstore';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function testLocalDriverRoundtrip() {
  const baseRoot = process.env.BLOBSTORE_TEST_ROOT
    ? path.resolve(process.env.BLOBSTORE_TEST_ROOT)
    : path.resolve(process.cwd(), 'tmp');
  const root = path.resolve(baseRoot, 'blobstore-test');
  await fs.promises.rm(root, { recursive: true, force: true });
  const store = new LocalBlobStore(root);
  const payload = Buffer.from('hello-blobstore');
  const objectKey = 'org-1/test.bin';

  await store.put({ objectKey, data: payload, contentType: 'text/plain' });
  const { stream } = await store.get(objectKey);
  const roundtrip = await streamToBuffer(stream);
  assert(roundtrip.toString() === payload.toString(), 'Local driver roundtrip mismatch');
  await store.delete(objectKey);
}

function testAesGcmRoundtrip() {
  const masterKey = crypto.randomBytes(32).toString('base64');
  const cryptoEnvelope = new CryptoEnvelope(masterKey, 'master-v1');
  const plaintext = Buffer.from('secret-payload');
  const encrypted = cryptoEnvelope.encrypt(plaintext);
  const decrypted = cryptoEnvelope.decryptBuffer(
    encrypted.ciphertext,
    encrypted.ivB64,
    encrypted.tagB64,
  );
  assert(decrypted.toString() === plaintext.toString(), 'AES-GCM decrypt mismatch');
}

function testPolicyNdaGate() {
  const policy = new AttachmentAccessPolicy();
  policy.assertCanDownload({
    requestOrgId: 'org-1',
    resourceOrgId: 'org-1',
    confidentiality: 'L2',
    ndaAccepted: false,
  });

  let threw = false;
  try {
    policy.assertCanDownload({
      requestOrgId: 'org-1',
      resourceOrgId: 'org-2',
      confidentiality: 'L2',
      ndaAccepted: false,
    });
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'Cross-tenant L2 without NDA should be forbidden');

  policy.assertCanDownload({
    requestOrgId: 'org-1',
    resourceOrgId: 'org-2',
    confidentiality: 'L2',
    ndaAccepted: true,
  });

  policy.assertCanDownload({
    requestOrgId: 'org-1',
    resourceOrgId: 'org-2',
    confidentiality: 'L1',
    ndaAccepted: false,
  });
}

class MemoryPrisma {
  public blobs: any[] = [];
  blob = {
    create: async (args: any) => {
      const record = { id: args.data.id, ...args.data };
      this.blobs.push(record);
      return record;
    },
    findUnique: async (args: any) => {
      return this.blobs.find((b) => b.id === args.where.id) || null;
    },
  };
}

class NoopStore implements BlobStore {
  driver: any = 'local';
  async put(input: any): Promise<void> {
    return input;
  }
  async get(objectKey: string): Promise<BlobStoreGetOutput> {
    throw new Error(`get not implemented for ${objectKey}`);
  }
  async delete(): Promise<void> {}
}

class SignedUrlStore extends NoopStore {
  driver: any = 's3';
  async getSignedUrl(objectKey: string, expiresInSeconds: number) {
    return {
      url: `https://signed.example/${objectKey}?exp=${expiresInSeconds}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }
}

class SignedStoreWithData extends SignedUrlStore {
  private stored?: Buffer;

  async put(input: any): Promise<void> {
    if (input.data instanceof Buffer) {
      this.stored = input.data;
    } else {
      this.stored = await streamToBuffer(input.data);
    }
  }

  async get(objectKey: string): Promise<BlobStoreGetOutput> {
    if (!this.stored) {
      throw new Error(`no data stored for ${objectKey}`);
    }
    return { stream: Readable.from(this.stored) };
  }
}

async function testUploadGuards() {
  const prisma = new MemoryPrisma();
  const store = new NoopStore();
  const svc = new BlobService(prisma as any, store, {
    driver: 'local',
    localRoot: '/tmp',
    maxUploadBytes: 8,
    allowedContentTypes: ['text/plain'],
    downloadUrlTtlSeconds: 120,
  });

  let threw = false;
  try {
    await svc.createBlob({
      orgId: 'org-guard',
      buffer: Buffer.alloc(32),
      filename: 'too-big.txt',
      contentType: 'text/plain',
      confidentiality: 'L1',
    });
  } catch (err) {
    threw = err instanceof BadRequestException;
  }
  assert(threw, 'Oversize uploads should be rejected');

  threw = false;
  try {
    await svc.createBlob({
      orgId: 'org-guard',
      buffer: Buffer.from('abc'),
      filename: 'bad.exe',
      contentType: 'application/x-msdownload',
      confidentiality: 'L1',
    });
  } catch (err) {
    threw = err instanceof BadRequestException;
  }
  assert(threw, 'Disallowed content types should be rejected');
}

async function testSignedUrlPath() {
  const prisma = new MemoryPrisma();
  const store = new SignedUrlStore();
  const svc = new BlobService(prisma as any, store as any, {
    driver: 's3',
    localRoot: '/tmp',
    allowedContentTypes: ['text/plain'],
    downloadUrlTtlSeconds: 90,
  });

  const blob = await svc.createBlob({
    orgId: 'org-1',
    buffer: Buffer.from('hello-signed'),
    filename: 'hello.txt',
    contentType: 'text/plain',
    confidentiality: 'L1',
  });

  const download = await svc.getBlobStream(blob.id, 'org-1');
  assert(download.signedUrl, 'Signed URL should be returned for unencrypted blobs');
  const ttlMs = 90 * 1000;
  const delta = Math.abs(download.expiresAt.getTime() - (Date.now() + ttlMs));
  assert(delta < 2000, 'Signed URL expiry should be near configured TTL');
  assert(!download.stream, 'Signed URL path should not include stream');
}

async function testEncryptedForcesStreaming() {
  const prisma = new MemoryPrisma();
  const store = new SignedStoreWithData();
  const svc = new BlobService(prisma as any, store as any, {
    driver: 's3',
    localRoot: '/tmp',
    allowedContentTypes: ['text/plain'],
    downloadUrlTtlSeconds: 60,
    masterKeyB64: Buffer.alloc(32, 7).toString('base64'),
    encryptionKeyId: 'master-v1',
  });

  const blob = await svc.createBlob({
    orgId: 'org-enc',
    buffer: Buffer.from('secret-sauce'),
    filename: 'secret.txt',
    contentType: 'text/plain',
    confidentiality: 'L2',
  });

  const download = await svc.getBlobStream(blob.id, 'org-enc');
  assert(!download.signedUrl, 'Encrypted blobs should not use signed URL direct access');
  const buf = await streamToBuffer(download.stream!);
  assert(buf.toString() === 'secret-sauce', 'Encrypted blob should decrypt on stream path');
}

async function run() {
  await testLocalDriverRoundtrip();
  testAesGcmRoundtrip();
  testPolicyNdaGate();
  await testUploadGuards();
  await testSignedUrlPath();
  await testEncryptedForcesStreaming();
  // eslint-disable-next-line no-console
  console.log('Blobstore unit tests passed.');
}

run();

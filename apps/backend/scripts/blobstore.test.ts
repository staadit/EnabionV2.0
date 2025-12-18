import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { AttachmentAccessPolicy } from '../src/blobstore/attachment.policy';
import { CryptoEnvelope } from '../src/blobstore/crypto-envelope';
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
  const root = path.resolve(process.cwd(), 'tmp', 'blobstore-test');
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
  let threw = false;
  try {
    policy.assertCanDownload({
      requestOrgId: 'org-1',
      resourceOrgId: 'org-1',
      role: 'Viewer',
      confidentiality: 'L2',
      ndaAccepted: false,
    });
  } catch (err) {
    if (err instanceof ForbiddenException) threw = true;
  }
  assert(threw, 'L2 without NDA should be forbidden');
}

async function run() {
  await testLocalDriverRoundtrip();
  testAesGcmRoundtrip();
  testPolicyNdaGate();
  // eslint-disable-next-line no-console
  console.log('Blobstore unit tests passed.');
}

run();

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NDA_FILES, NDA_V0_1_EN_HASH } from '../src/nda/nda.constants';

function readFirstExisting(paths: string[]) {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error('NDA EN file not found for hash test');
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const candidates = [
  path.resolve(__dirname, '..', '..', 'docs', 'R1.0', 'legal', 'nda', NDA_FILES.en),
  path.resolve(__dirname, '..', 'src', 'nda', 'content', NDA_FILES.en),
];

const content = readFirstExisting(candidates);
const hash = sha256(content);

if (hash !== NDA_V0_1_EN_HASH) {
  throw new Error(`NDA hash mismatch. Expected ${NDA_V0_1_EN_HASH}, got ${hash}`);
}

// eslint-disable-next-line no-console
console.log('NDA hash test passed.');

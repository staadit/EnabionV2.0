import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

type ScryptParams = {
  N: number;
  r: number;
  p: number;
  keyLen: number;
};

const DEFAULT_SCRYPT: ScryptParams = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, DEFAULT_SCRYPT.keyLen, {
    N: DEFAULT_SCRYPT.N,
    r: DEFAULT_SCRYPT.r,
    p: DEFAULT_SCRYPT.p,
  }) as Buffer;
  return [
    'scrypt',
    DEFAULT_SCRYPT.N,
    DEFAULT_SCRYPT.r,
    DEFAULT_SCRYPT.p,
    salt,
    derived.toString('hex'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, nStr, rStr, pStr, salt, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!N || !r || !p || !salt || !hashHex) {
    return false;
  }

  const hashBuffer = Buffer.from(hashHex, 'hex');
  if (!hashBuffer.length) {
    return false;
  }

  const derived = scryptSync(password, salt, hashBuffer.length, {
    N,
    r,
    p,
  }) as Buffer;

  return timingSafeEqual(hashBuffer, derived);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

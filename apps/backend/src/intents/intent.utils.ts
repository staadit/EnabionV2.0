import { createHash } from 'node:crypto';

const SHORT_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SHORT_ID_WIDTH = 7;
const CHECKSUM_SIZE = 2;

export function buildIntentShortId(intentNumber: number): string {
  const padded = String(intentNumber).padStart(SHORT_ID_WIDTH, '0');
  const checksum = computeChecksum(padded);
  return `INT-${padded}${checksum}`;
}

export function normalizeIntentName(value: string): string {
  return value.trim();
}

function computeChecksum(input: string): string {
  const hash = createHash('sha256').update(input).digest();
  const value = (hash[0] << 8) | hash[1];
  const base = SHORT_ID_ALPHABET.length;
  const first = Math.floor(value / base) % base;
  const second = value % base;
  return `${SHORT_ID_ALPHABET[first]}${SHORT_ID_ALPHABET[second]}`.slice(0, CHECKSUM_SIZE);
}

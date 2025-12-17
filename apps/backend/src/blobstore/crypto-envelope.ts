import * as crypto from 'node:crypto';
import { ConfidentialityLevel } from './types';

export interface EncryptResult {
  ciphertext: Buffer;
  ivB64: string;
  tagB64: string;
  alg: string;
  keyId: string;
}

export class CryptoEnvelope {
  constructor(
    private readonly masterKeyB64: string | undefined,
    private readonly keyId: string,
  ) {}

  shouldEncrypt(confidentiality: ConfidentialityLevel) {
    return confidentiality !== 'L1';
  }

  private getKey(): Buffer {
    if (!this.masterKeyB64) {
      throw new Error('BLOB_ENC_MASTER_KEY is required for L2+ encryption');
    }
    const key = Buffer.from(this.masterKeyB64, 'base64');
    if (key.length !== 32) {
      throw new Error('BLOB_ENC_MASTER_KEY must be 32 bytes (base64-encoded)');
    }
    return key;
  }

  encrypt(plaintext: Buffer): EncryptResult {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext,
      ivB64: iv.toString('base64'),
      tagB64: tag.toString('base64'),
      alg: 'AES-256-GCM',
      keyId: this.keyId,
    };
  }

  decryptBuffer(ciphertext: Buffer, ivB64: string, tagB64: string): Buffer {
    const key = this.getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext;
  }

  decryptStream(
    encryptedStream: NodeJS.ReadableStream,
    ivB64: string,
    tagB64: string,
  ): NodeJS.ReadableStream {
    const key = this.getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    encryptedStream.on('error', (err) => decipher.destroy(err));
    return encryptedStream.pipe(decipher);
  }
}

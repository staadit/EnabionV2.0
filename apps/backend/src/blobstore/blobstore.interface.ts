import { StorageDriverKind } from './types';

export interface BlobStorePutInput {
  objectKey: string;
  data: Buffer | NodeJS.ReadableStream;
  contentType?: string;
}

export interface BlobStoreGetOutput {
  stream: NodeJS.ReadableStream;
  contentType?: string;
}

export interface BlobStoreSignedUrlOutput {
  url: string;
  expiresAt: Date;
}

export interface BlobStore {
  driver: StorageDriverKind;
  put(input: BlobStorePutInput): Promise<void>;
  get(objectKey: string): Promise<BlobStoreGetOutput>;
  delete(objectKey: string): Promise<void>;
  getSignedUrl?(objectKey: string, expiresInSeconds: number): Promise<BlobStoreSignedUrlOutput>;
}

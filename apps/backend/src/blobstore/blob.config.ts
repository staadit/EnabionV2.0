import * as path from 'node:path';

export type BlobStorageDriverType = 'local' | 's3';

export interface S3Config {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface BlobConfig {
  driver: BlobStorageDriverType;
  localRoot: string;
  masterKeyB64?: string;
  encryptionKeyId?: string;
  maxUploadBytes?: number;
  allowedContentTypes?: string[];
  downloadUrlTtlSeconds?: number;
  s3?: S3Config;
}

export function loadBlobConfig(): BlobConfig {
  const DEFAULT_ALLOWED_TYPES = [
    'application/octet-stream',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
  ];
  const DEFAULT_MAX_UPLOAD_MB = 25;
  const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

  const driverEnv = (process.env.BLOBSTORE_DRIVER || 'local').toLowerCase();
  const driver: BlobStorageDriverType = driverEnv === 's3' ? 's3' : 'local';
  const localRoot =
    process.env.BLOBSTORE_LOCAL_ROOT || path.resolve(process.cwd(), 'tmp', 'blobstore');
  const masterKeyB64 = process.env.BLOB_ENC_MASTER_KEY;
  const encryptionKeyId = process.env.BLOB_ENC_KEY_ID || 'master-v1';

  const parsedMaxUpload = process.env.BLOBSTORE_MAX_UPLOAD_MB
    ? Number(process.env.BLOBSTORE_MAX_UPLOAD_MB)
    : DEFAULT_MAX_UPLOAD_MB;
  const maxUploadMb = Number.isNaN(parsedMaxUpload) ? DEFAULT_MAX_UPLOAD_MB : parsedMaxUpload;
  const parsedTtl = process.env.BLOBSTORE_SIGNED_URL_TTL_SECONDS
    ? Number(process.env.BLOBSTORE_SIGNED_URL_TTL_SECONDS)
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
  const downloadUrlTtlSeconds = Number.isNaN(parsedTtl)
    ? DEFAULT_SIGNED_URL_TTL_SECONDS
    : parsedTtl;

  const cfg: BlobConfig = {
    driver,
    localRoot,
    masterKeyB64,
    encryptionKeyId,
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
    },
    downloadUrlTtlSeconds,
  };

  if (!Number.isNaN(maxUploadMb) && maxUploadMb > 0) {
    cfg.maxUploadBytes = maxUploadMb * 1024 * 1024;
  }

  const allowList = process.env.BLOBSTORE_ALLOWED_CONTENT_TYPES;
  cfg.allowedContentTypes = allowList
    ? allowList
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_ALLOWED_TYPES;

  return cfg;
}

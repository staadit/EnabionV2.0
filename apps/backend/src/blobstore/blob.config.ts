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
  s3?: S3Config;
}

export function loadBlobConfig(): BlobConfig {
  const driverEnv = (process.env.BLOBSTORE_DRIVER || 'local').toLowerCase();
  const driver: BlobStorageDriverType = driverEnv === 's3' ? 's3' : 'local';
  const localRoot =
    process.env.BLOBSTORE_LOCAL_ROOT || path.resolve(process.cwd(), 'tmp', 'blobstore');
  const masterKeyB64 = process.env.BLOB_ENC_MASTER_KEY;
  const encryptionKeyId = process.env.BLOB_ENC_KEY_ID || 'master-v1';

  const maxUploadMb = process.env.BLOBSTORE_MAX_UPLOAD_MB
    ? Number(process.env.BLOBSTORE_MAX_UPLOAD_MB)
    : undefined;

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
  };

  if (maxUploadMb && !Number.isNaN(maxUploadMb) && maxUploadMb > 0) {
    cfg.maxUploadBytes = maxUploadMb * 1024 * 1024;
  }

  const allowList = process.env.BLOBSTORE_ALLOWED_CONTENT_TYPES;
  if (allowList) {
    cfg.allowedContentTypes = allowList
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return cfg;
}

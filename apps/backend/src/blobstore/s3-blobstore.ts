import { HttpRequest } from '@smithy/protocol-http';
import { Hash } from '@smithy/hash-node';
import { SignatureV4MultiRegion } from '@aws-sdk/signature-v4-multi-region';
import {
  BlobStore,
  BlobStoreGetOutput,
  BlobStorePutInput,
  BlobStoreSignedUrlOutput,
} from './blobstore.interface';
import { S3Config } from './blob.config';
import { StorageDriverKind } from './types';

type LoadedS3 = {
  client: any;
  PutObjectCommand: any;
  GetObjectCommand: any;
  DeleteObjectCommand: any;
};

export class S3BlobStore implements BlobStore {
  public readonly driver: StorageDriverKind = 's3';
  private loader?: Promise<LoadedS3>;

  constructor(private readonly config: S3Config) {}

  private static readonly Sha256 = class Sha256 extends Hash {
    constructor(secret?: any) {
      super('sha256', secret);
    }
  };

  private buildEndpoint() {
    const endpoint =
      this.config.endpoint ||
      `https://s3.${this.config.region || 'us-east-1'}.amazonaws.com`;
    return new URL(endpoint);
  }

  private encodeKey(objectKey: string) {
    return objectKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  private formatUrl(request: {
    protocol?: string;
    hostname?: string;
    port?: number;
    path?: string;
    query?: Record<string, string | number | string[] | null | undefined>;
  }): string {
    const protocol = request.protocol || 'https:';
    const port = request.port ? `:${request.port}` : '';
    const path = request.path || '/';
    const query = request.query || {};
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const search = searchParams.toString();
    return `${protocol}//${request.hostname}${port}${path}${search ? `?${search}` : ''}`;
  }

  private async presign(objectKey: string, expiresInSeconds: number): Promise<BlobStoreSignedUrlOutput> {
    const { client } = await this.ensureClient();
    const credentials =
      typeof client.config.credentials === 'function'
        ? await client.config.credentials()
        : client.config.credentials;
    const region =
      typeof client.config.region === 'function'
        ? await client.config.region()
        : client.config.region || this.config.region || 'us-east-1';

    const endpoint = this.buildEndpoint();
    const request = new HttpRequest({
      protocol: endpoint.protocol || 'https:',
      hostname: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : undefined,
      method: 'GET',
      path: `/${this.config.bucket}/${this.encodeKey(objectKey)}`,
      query: {},
      headers: {
        host: endpoint.hostname,
      },
    });

    const signer = new SignatureV4MultiRegion({
      service: 's3',
      region,
      credentials,
      sha256: S3BlobStore.Sha256,
    });

    const signed = await signer.presign(request, { expiresIn: expiresInSeconds });
    return {
      url: this.formatUrl(signed),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  private async ensureClient(): Promise<LoadedS3> {
    if (this.loader) return this.loader;

    this.loader = (async () => {
      if (!this.config.bucket) {
        throw new Error('S3 driver requires S3_BUCKET to be set');
      }

      let mod: any;
      try {
        mod = await import('@aws-sdk/client-s3');
      } catch (err) {
        throw new Error(
          'S3 driver requires optional dependency @aws-sdk/client-s3. Install it to enable S3 uploads/downloads.',
        );
      }

      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = mod;
      const client = new S3Client({
        endpoint: this.config.endpoint,
        region: this.config.region || 'us-east-1',
        forcePathStyle: Boolean(this.config.endpoint),
        credentials:
          this.config.accessKey && this.config.secretKey
            ? {
                accessKeyId: this.config.accessKey,
                secretAccessKey: this.config.secretKey,
              }
            : undefined,
      });

      return { client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
    })();

    return this.loader;
  }

  async put(input: BlobStorePutInput): Promise<void> {
    const { client, PutObjectCommand } = await this.ensureClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        Body: input.data as any,
        ContentType: input.contentType,
      }),
    );
  }

  async get(objectKey: string): Promise<BlobStoreGetOutput> {
    const { client, GetObjectCommand } = await this.ensureClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
    );
    if (!res.Body || typeof (res.Body as any).pipe !== 'function') {
      throw new Error('S3 getObject returned empty body');
    }
    return { stream: res.Body as any, contentType: (res as any).ContentType };
  }

  async delete(objectKey: string): Promise<void> {
    const { client, DeleteObjectCommand } = await this.ensureClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
    );
  }

  async getSignedUrl(objectKey: string, expiresInSeconds: number): Promise<BlobStoreSignedUrlOutput> {
    return this.presign(objectKey, expiresInSeconds);
  }
}

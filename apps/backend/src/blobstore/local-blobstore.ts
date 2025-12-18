import * as fs from 'node:fs';
import * as path from 'node:path';
import { BlobStore, BlobStoreGetOutput, BlobStorePutInput } from './blobstore.interface';
import { StorageDriverKind } from './types';

export class LocalBlobStore implements BlobStore {
  public readonly driver: StorageDriverKind = 'local';

  constructor(private readonly root: string) {}

  private resolvePath(objectKey: string): string {
    const normalized = path.normalize(objectKey).replace(/^(\.\.[/\\])+/, '');
    const target = path.resolve(this.root, normalized);
    const safeRoot = path.resolve(this.root);

    if (!target.startsWith(safeRoot)) {
      throw new Error('Invalid objectKey path traversal detected');
    }
    return target;
  }

  async put(input: BlobStorePutInput): Promise<void> {
    const target = this.resolvePath(input.objectKey);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });

    if (input.data instanceof Buffer) {
      await fs.promises.writeFile(target, input.data);
      return;
    }

    const dataStream = input.data as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(target);
      dataStream.pipe(writeStream);
      dataStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  }

  async get(objectKey: string): Promise<BlobStoreGetOutput> {
    const target = this.resolvePath(objectKey);
    const stream = fs.createReadStream(target);
    return { stream };
  }

  async delete(objectKey: string): Promise<void> {
    const target = this.resolvePath(objectKey);
    try {
      await fs.promises.unlink(target);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

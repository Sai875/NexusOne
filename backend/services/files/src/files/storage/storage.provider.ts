import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream, mkdirSync, promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Readable } from 'stream';

/**
 * Storage abstraction. The MVP ships a local-disk implementation; the S3
 * implementation is a drop-in replacement behind the same interface
 * (bucket/permissions are documented in docs/architecture.md).
 */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StoredObject {
  key: string;
  size: number;
}

export interface StorageProvider {
  /** Persist a stream (e.g. a chunk or uploaded file) to storage. */
  put(key: string, stream: Readable): Promise<StoredObject>;
  /** Open a readable stream for a stored object. */
  get(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get('FILES_UPLOAD_DIR', 'uploads');
    mkdirSync(this.root, { recursive: true });
    this.logger.log(`Local storage root: ${this.root}`);
  }

  private resolve(key: string): string {
    // Prevent path traversal outside the storage root.
    const safe = key.replace(/[^a-zA-Z0-9/._-]/g, '');
    const full = join(this.root, safe);
    if (!full.startsWith(join(this.root, ''))) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async put(key: string, stream: Readable): Promise<StoredObject> {
    const full = this.resolve(key);
    await fs.mkdir(dirname(full), { recursive: true });
    const size = await new Promise<number>((resolve, reject) => {
      let bytes = 0;
      const sink = createWriteStream(full);
      stream.on('data', (chunk: Buffer) => (bytes += chunk.length));
      stream.on('error', reject);
      sink.on('error', reject);
      sink.on('finish', () => resolve(bytes));
      stream.pipe(sink);
    });
    return { key, size };
  }

  async get(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      // File already gone — nothing to clean up.
    }
  }
}

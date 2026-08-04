import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Object-storage abstraction (ARCHITECTURE.md §2). Two drivers ship behind it:
 * local disk for development/single-instance, and any S3-compatible bucket
 * (Cloudflare R2, AWS S3, MinIO) for production, selected purely by env —
 * setting S3_BUCKET switches the driver, no code change.
 */
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  getStream(key: string): Promise<Readable>;
  size(key: string): Promise<number>;
}

export class LocalDiskStorage implements FileStorage {
  constructor(private readonly rootDir: string) {}

  /** Maps a storage key to a path, refusing traversal outside the root. */
  private pathFor(key: string): string {
    const path = normalize(join(this.rootDir, key));
    if (!path.startsWith(this.rootDir + sep)) {
      throw new Error('invalid storage key');
    }
    return path;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async getStream(key: string): Promise<Readable> {
    return createReadStream(this.pathFor(key));
  }

  async size(key: string): Promise<number> {
    return (await stat(this.pathFor(key))).size;
  }
}

export class S3Storage implements FileStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data }),
    );
  }

  async getStream(key: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    // In the Node runtime GetObject's Body is always a Readable.
    return res.Body as Readable;
  }

  async size(key: string): Promise<number> {
    const res = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return res.ContentLength ?? 0;
  }
}

@Injectable()
export class StorageService implements FileStorage {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: FileStorage;

  constructor(config: ConfigService) {
    // Empty-string env vars (e.g. `S3_BUCKET=` in .env) count as unset.
    const env = (key: string): string | undefined =>
      config.get<string>(key)?.trim() || undefined;

    const bucket = env('S3_BUCKET');
    if (bucket !== undefined) {
      const accessKeyId = env('S3_ACCESS_KEY_ID');
      const secretAccessKey = env('S3_SECRET_ACCESS_KEY');
      if (accessKeyId === undefined || secretAccessKey === undefined) {
        throw new Error(
          'S3_BUCKET is set but S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing',
        );
      }
      const endpoint = env('S3_ENDPOINT');
      this.driver = new S3Storage(
        new S3Client({
          region: env('S3_REGION') ?? 'auto',
          // Path-style keeps bucket names out of DNS — required by MinIO and
          // safe for R2/S3 alike when a custom endpoint is in play.
          ...(endpoint !== undefined ? { endpoint, forcePathStyle: true } : {}),
          credentials: { accessKeyId, secretAccessKey },
        }),
        bucket,
      );
      this.logger.log(
        `document storage: S3-compatible bucket "${bucket}"${endpoint !== undefined ? ` at ${endpoint}` : ''}`,
      );
    } else {
      const rootDir = resolve(config.get<string>('FILE_STORAGE_DIR', 'storage'));
      this.driver = new LocalDiskStorage(rootDir);
      this.logger.log(`document storage: local disk at ${rootDir}`);
    }
  }

  put(key: string, data: Buffer): Promise<void> {
    return this.driver.put(key, data);
  }

  getStream(key: string): Promise<Readable> {
    return this.driver.getStream(key);
  }

  size(key: string): Promise<number> {
    return this.driver.size(key);
  }
}

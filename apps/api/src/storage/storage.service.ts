import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Object-storage abstraction. The local-disk implementation below serves
 * development and early testing; a Cloudflare R2 / S3 implementation swaps in
 * behind this same interface at deployment time (ARCHITECTURE.md §2), the
 * same adapter pattern used for Arive.
 */
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  getStream(key: string): Promise<Readable>;
  size(key: string): Promise<number>;
}

@Injectable()
export class StorageService implements FileStorage {
  private readonly rootDir: string;

  constructor(config: ConfigService) {
    this.rootDir = resolve(config.get<string>('FILE_STORAGE_DIR', 'storage'));
  }

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

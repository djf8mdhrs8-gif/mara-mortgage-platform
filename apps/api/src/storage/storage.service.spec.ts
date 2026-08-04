import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it } from 'vitest';

import type { ConfigService } from '@nestjs/config';

import { LocalDiskStorage, S3Storage, StorageService } from './storage.service';

function makeConfig(env: Record<string, string>): ConfigService {
  return {
    get: (key: string, defaultValue?: string) => env[key] ?? defaultValue,
  } as unknown as ConfigService;
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe('LocalDiskStorage', () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round-trips put → getStream → size', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mara-storage-'));
    const storage = new LocalDiskStorage(dir);
    const data = Buffer.from('hello documents');

    await storage.put('documents/app_1/doc_1', data);

    expect(await storage.size('documents/app_1/doc_1')).toBe(data.length);
    expect(await readAll(await storage.getStream('documents/app_1/doc_1'))).toEqual(data);
  });

  it('refuses keys that traverse outside the root', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mara-storage-'));
    const storage = new LocalDiskStorage(dir);

    await expect(storage.put('../escape', Buffer.from('x'))).rejects.toThrow(
      'invalid storage key',
    );
  });
});

describe('S3Storage', () => {
  function makeFakeClient() {
    const sent: object[] = [];
    const client = {
      send: (command: { input: object }) => {
        sent.push(command);
        if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: 'fake-stream' });
        }
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({ ContentLength: 42 });
        }
        return Promise.resolve({});
      },
    } as unknown as S3Client;
    return { client, sent };
  }

  it('puts objects into the configured bucket', async () => {
    const { client, sent } = makeFakeClient();
    const storage = new S3Storage(client, 'mara-documents');
    const data = Buffer.from('pdf bytes');

    await storage.put('documents/app_1/doc_1', data);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    expect((sent[0] as PutObjectCommand).input).toEqual({
      Bucket: 'mara-documents',
      Key: 'documents/app_1/doc_1',
      Body: data,
    });
  });

  it('streams objects back and reports their size', async () => {
    const { client, sent } = makeFakeClient();
    const storage = new S3Storage(client, 'mara-documents');

    expect(await storage.getStream('documents/app_1/doc_1')).toBe('fake-stream');
    expect(await storage.size('documents/app_1/doc_1')).toBe(42);
    expect(sent[0]).toBeInstanceOf(GetObjectCommand);
    expect(sent[1]).toBeInstanceOf(HeadObjectCommand);
    expect((sent[1] as HeadObjectCommand).input).toEqual({
      Bucket: 'mara-documents',
      Key: 'documents/app_1/doc_1',
    });
  });
});

describe('StorageService driver selection', () => {
  it('defaults to the local-disk driver when S3_BUCKET is unset', () => {
    const service = new StorageService(makeConfig({}));
    expect((service as unknown as { driver: unknown }).driver).toBeInstanceOf(
      LocalDiskStorage,
    );
  });

  it('treats an empty S3_BUCKET as unset', () => {
    const service = new StorageService(makeConfig({ S3_BUCKET: '  ' }));
    expect((service as unknown as { driver: unknown }).driver).toBeInstanceOf(
      LocalDiskStorage,
    );
  });

  it('selects the S3 driver when the bucket and credentials are set', () => {
    const service = new StorageService(
      makeConfig({
        S3_BUCKET: 'mara-documents',
        S3_ENDPOINT: 'https://acc.r2.cloudflarestorage.com',
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
      }),
    );
    expect((service as unknown as { driver: unknown }).driver).toBeInstanceOf(S3Storage);
  });

  it('fails fast when the bucket is set but credentials are missing', () => {
    expect(() => new StorageService(makeConfig({ S3_BUCKET: 'mara-documents' }))).toThrow(
      /S3_ACCESS_KEY_ID/,
    );
  });
});

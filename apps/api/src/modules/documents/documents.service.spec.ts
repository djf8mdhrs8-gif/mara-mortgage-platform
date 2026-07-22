import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { DocumentsService } from './documents.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../storage/storage.service';

interface AppRow {
  id: string;
  userId: string;
}

interface DocRow {
  id: string;
  applicationId: string;
  uploaderId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  status: 'UPLOADED' | 'IN_REVIEW' | 'ACCEPTED' | 'NEEDS_RESUBMISSION';
  createdAt: Date;
  updatedAt: Date;
}

function makeFakes() {
  const apps: AppRow[] = [
    { id: 'app_a', userId: 'user_a' },
    { id: 'app_b', userId: 'user_b' },
  ];
  const docs: DocRow[] = [];
  const stored = new Map<string, Buffer>();
  let seq = 0;

  const prisma = {
    application: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(apps.find((a) => a.id === where.id) ?? null),
    },
    document: {
      create: ({ data }: { data: Omit<DocRow, 'id' | 'status' | 'createdAt' | 'updatedAt'> }) => {
        const row: DocRow = {
          ...data,
          id: `doc_${++seq}`,
          status: 'UPLOADED',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        docs.push(row);
        return Promise.resolve(row);
      },
      findMany: ({ where }: { where: { applicationId: string } }) =>
        Promise.resolve(docs.filter((d) => d.applicationId === where.applicationId)),
      findUnique: ({ where, include }: { where: { id: string }; include?: { application?: boolean } }) => {
        const doc = docs.find((d) => d.id === where.id);
        if (doc === undefined) return Promise.resolve(null);
        if (include?.application === true) {
          return Promise.resolve({ ...doc, application: apps.find((a) => a.id === doc.applicationId) });
        }
        return Promise.resolve(doc);
      },
      update: ({ where, data }: { where: { id: string }; data: { status: DocRow['status'] } }) => {
        const doc = docs.find((d) => d.id === where.id);
        if (doc !== undefined) {
          doc.status = data.status;
          doc.updatedAt = new Date();
        }
        return Promise.resolve(doc);
      },
    },
  } as unknown as PrismaService;

  const storage = {
    put: (key: string, data: Buffer) => {
      stored.set(key, data);
      return Promise.resolve();
    },
    getStream: (key: string) => Promise.resolve({ key } as never),
    size: (key: string) => Promise.resolve(stored.get(key)?.length ?? 0),
  } as unknown as StorageService;

  return { prisma, storage, stored };
}

const borrowerA: AccessTokenPayload = { sub: 'user_a', role: 'BORROWER' };
const borrowerB: AccessTokenPayload = { sub: 'user_b', role: 'BORROWER' };
const loanOfficer: AccessTokenPayload = { sub: 'user_lo', role: 'LOAN_OFFICER' };

const pdf = (name = 'bank-statement.pdf') => ({
  originalname: name,
  mimetype: 'application/pdf',
  size: 5,
  buffer: Buffer.from('%PDF-'),
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let stored: Map<string, Buffer>;

  beforeEach(() => {
    const fakes = makeFakes();
    stored = fakes.stored;
    service = new DocumentsService(fakes.prisma, fakes.storage);
  });

  it('uploads and lists a document for the owning borrower', async () => {
    const doc = await service.upload('app_a', borrowerA, pdf());
    expect(doc.fileName).toBe('bank-statement.pdf');
    expect(stored.size).toBe(1);

    const list = await service.list('app_a', borrowerA);
    expect(list).toHaveLength(1);
  });

  it("blocks a borrower from another borrower's application with 404", async () => {
    await expect(service.upload('app_a', borrowerB, pdf())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.list('app_a', borrowerB)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("blocks a borrower from downloading another borrower's document with 404", async () => {
    const doc = await service.upload('app_a', borrowerA, pdf());
    await expect(service.openDownload(doc.id, borrowerB)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.openDownload(doc.id, borrowerA)).resolves.toMatchObject({
      meta: { id: doc.id },
    });
  });

  it('staff can list and download any document', async () => {
    const doc = await service.upload('app_a', borrowerA, pdf());
    await expect(service.list('app_a', loanOfficer)).resolves.toHaveLength(1);
    await expect(service.openDownload(doc.id, loanOfficer)).resolves.toMatchObject({
      meta: { id: doc.id },
    });
  });

  it('rejects oversized files and disallowed types', async () => {
    await expect(
      service.upload('app_a', borrowerA, { ...pdf(), size: 16 * 1024 * 1024 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.upload('app_a', borrowerA, { ...pdf(), mimetype: 'application/x-msdownload' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateStatus changes the review state and 404s on unknown ids', async () => {
    const doc = await service.upload('app_a', borrowerA, pdf());
    const updated = await service.updateStatus(doc.id, 'NEEDS_RESUBMISSION');
    expect(updated.status).toBe('NEEDS_RESUBMISSION');

    const list = await service.list('app_a', borrowerA);
    expect(list[0]?.status).toBe('NEEDS_RESUBMISSION');

    await expect(service.updateStatus('doc_missing', 'ACCEPTED')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sanitizes hostile filenames but keeps the storage key server-generated', async () => {
    const doc = await service.upload('app_a', borrowerA, pdf('../../etc/passwd<script>.pdf'));
    expect(doc.fileName).not.toContain('/');
    expect(doc.fileName).not.toContain('<');
    const key = [...stored.keys()][0];
    expect(key).toMatch(/^documents\/app_a\/[0-9a-f-]{36}$/);
  });
});

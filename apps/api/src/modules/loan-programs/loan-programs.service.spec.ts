import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { LoanProgramsService } from './loan-programs.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakePrisma() {
  const rows: ProgramRow[] = [];
  let seq = 0;

  const prisma = {
    loanProgram: {
      findMany: ({ where }: { where?: { published?: boolean } }) =>
        Promise.resolve(
          rows.filter((r) => where?.published === undefined || r.published === where.published),
        ),
      findUnique: ({ where }: { where: { slug?: string; id?: string } }) =>
        Promise.resolve(
          rows.find((r) => (where.slug !== undefined ? r.slug === where.slug : r.id === where.id)) ??
            null,
        ),
      create: ({ data }: { data: Omit<ProgramRow, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const row: ProgramRow = {
          ...data,
          id: `lp_${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rows.push(row);
        return Promise.resolve(row);
      },
      update: ({ where, data }: { where: { id: string }; data: Partial<ProgramRow> }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row !== undefined) Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row);
      },
    },
  };

  return prisma as unknown as PrismaService;
}

const borrower: AccessTokenPayload = { sub: 'u1', role: 'BORROWER' };
const admin: AccessTokenPayload = { sub: 'u2', role: 'ADMIN' };

const FHA = {
  slug: 'fha',
  title: 'FHA Loans',
  summary: 'Flexible credit, low down payment.',
  content: 'Insured by the FHA…',
  published: true,
};

describe('LoanProgramsService', () => {
  let service: LoanProgramsService;

  beforeEach(() => {
    service = new LoanProgramsService(makeFakePrisma());
  });

  it('borrowers see only published programs; staff see drafts too', async () => {
    await service.create({ ...FHA });
    await service.create({ ...FHA, slug: 'draft-prog', title: 'Draft', published: false });

    await expect(service.list(borrower)).resolves.toHaveLength(1);
    await expect(service.list(admin)).resolves.toHaveLength(2);
  });

  it('unpublished programs 404 for borrowers but resolve for staff', async () => {
    await service.create({ ...FHA, slug: 'hidden', published: false });

    await expect(service.getBySlug('hidden', borrower)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getBySlug('hidden', admin)).resolves.toMatchObject({ slug: 'hidden' });
  });

  it('rejects duplicate slugs on create and on update', async () => {
    const a = await service.create({ ...FHA });
    await service.create({ ...FHA, slug: 'va' });

    await expect(service.create({ ...FHA })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update(a.id, { slug: 'va' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('update edits content in place and 404s on unknown ids', async () => {
    const created = await service.create({ ...FHA });
    const updated = await service.update(created.id, { title: 'FHA Loans (2026)' });
    expect(updated.title).toBe('FHA Loans (2026)');

    await expect(service.update('lp_missing', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

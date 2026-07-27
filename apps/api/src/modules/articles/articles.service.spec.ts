import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { ArticlesService } from './articles.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakePrisma() {
  const rows: ArticleRow[] = [];
  let seq = 0;

  const prisma = {
    article: {
      findMany: ({ where }: { where?: { published?: boolean } }) =>
        Promise.resolve(
          rows.filter((r) => where?.published === undefined || r.published === where.published),
        ),
      findUnique: ({ where }: { where: { slug?: string; id?: string } }) => {
        const row = rows.find((r) =>
          where.slug !== undefined ? r.slug === where.slug : r.id === where.id,
        );
        return Promise.resolve(row === undefined ? null : { ...row });
      },
      create: ({ data }: { data: Omit<ArticleRow, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const row: ArticleRow = {
          ...data,
          id: `a_${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rows.push(row);
        return Promise.resolve({ ...row });
      },
      update: ({ where, data }: { where: { id: string }; data: Partial<ArticleRow> }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row !== undefined) Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row === undefined ? null : { ...row });
      },
    },
  };

  return prisma as unknown as PrismaService;
}

const borrower: AccessTokenPayload = { sub: 'u1', role: 'BORROWER' };
const admin: AccessTokenPayload = { sub: 'u2', role: 'ADMIN' };

const DRAFT = {
  slug: 'credit-myths',
  title: 'Five Credit Myths',
  content: 'Myth one…',
};

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(() => {
    service = new ArticlesService(makeFakePrisma());
  });

  it('drafts are hidden from borrowers but visible to staff', async () => {
    await service.create({ ...DRAFT });

    await expect(service.list(borrower)).resolves.toHaveLength(0);
    await expect(service.list(admin)).resolves.toHaveLength(1);
    await expect(service.getBySlug('credit-myths', borrower)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('publishedAt stamps once on the draft→published transition', async () => {
    const draft = await service.create({ ...DRAFT });
    expect(draft.publishedAt).toBeNull();

    const published = await service.update(draft.id, { published: true });
    expect(published.publishedAt).not.toBeNull();

    // Editing later keeps the original publishedAt
    const edited = await service.update(draft.id, { title: 'Five Credit Myths (2026)' });
    expect(edited.publishedAt).toBe(published.publishedAt);
  });

  it('create with published:true is immediately visible and stamped', async () => {
    await service.create({ ...DRAFT, published: true });
    const list = await service.list(borrower);
    expect(list).toHaveLength(1);
    expect(list[0]?.publishedAt).not.toBeNull();
  });

  it('rejects duplicate slugs and unknown ids', async () => {
    const first = await service.create({ ...DRAFT });
    await expect(service.create({ ...DRAFT })).rejects.toBeInstanceOf(ConflictException);
    await service.create({ ...DRAFT, slug: 'other' });
    await expect(service.update(first.id, { slug: 'other' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.update('a_missing', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

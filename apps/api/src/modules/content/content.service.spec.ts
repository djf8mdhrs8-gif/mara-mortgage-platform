import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { ContentService } from './content.service';
import type { PrismaService } from '../../prisma/prisma.service';

function makeFakePrisma() {
  const blocks = new Map<string, { key: string; body: string; updatedAt: Date }>();
  const prisma = {
    contentBlock: {
      findUnique: ({ where }: { where: { key: string } }) =>
        Promise.resolve(blocks.get(where.key) ?? null),
      upsert: ({ where, create, update }: {
        where: { key: string };
        create: { key: string; body: string };
        update: { body: string };
      }) => {
        const existing = blocks.get(where.key);
        const row = existing === undefined
          ? { key: create.key, body: create.body, updatedAt: new Date() }
          : { ...existing, body: update.body, updatedAt: new Date() };
        blocks.set(where.key, row);
        return Promise.resolve(row);
      },
    },
  };
  return prisma as unknown as PrismaService;
}

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    service = new ContentService(makeFakePrisma());
  });

  it('404s on unknown keys', async () => {
    await expect(service.get('compliance.missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upsert creates then updates in place', async () => {
    const created = await service.upsert('compliance.footer', 'NMLS #1806779');
    expect(created.body).toBe('NMLS #1806779');

    const updated = await service.upsert('compliance.footer', 'NMLS #1806779 · Equal Housing Lender');
    expect(updated.body).toContain('Equal Housing');
    await expect(service.get('compliance.footer')).resolves.toMatchObject({
      body: 'NMLS #1806779 · Equal Housing Lender',
    });
  });
});

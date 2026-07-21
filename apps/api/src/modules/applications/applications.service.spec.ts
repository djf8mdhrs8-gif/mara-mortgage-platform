import { NotFoundException } from '@nestjs/common';
import type { ApplicationStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApplicationsService } from './applications.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface AppRow {
  id: string;
  userId: string;
  ariveLoanId: string | null;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakePrisma() {
  const apps: AppRow[] = [];
  let seq = 0;

  const prisma = {
    application: {
      create: ({ data }: { data: { userId: string } }) => {
        const row: AppRow = {
          id: `app_${++seq}`,
          userId: data.userId,
          ariveLoanId: null,
          status: 'DRAFT',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        apps.push(row);
        return Promise.resolve(row);
      },
      findMany: ({ where }: { where?: { userId?: string } }) =>
        Promise.resolve(
          where?.userId === undefined ? [...apps] : apps.filter((a) => a.userId === where.userId),
        ),
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(apps.find((a) => a.id === where.id) ?? null),
      update: ({ where, data }: { where: { id: string }; data: { status: ApplicationStatus } }) => {
        const row = apps.find((a) => a.id === where.id);
        if (row !== undefined) {
          row.status = data.status;
          row.updatedAt = new Date();
        }
        return Promise.resolve(row);
      },
    },
  };

  return prisma as unknown as PrismaService;
}

const borrowerA: AccessTokenPayload = { sub: 'user_a', role: 'BORROWER' };
const borrowerB: AccessTokenPayload = { sub: 'user_b', role: 'BORROWER' };
const loanOfficer: AccessTokenPayload = { sub: 'user_lo', role: 'LOAN_OFFICER' };

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(() => {
    service = new ApplicationsService(makeFakePrisma());
  });

  it("borrowers only see their own applications in list()", async () => {
    await service.create(borrowerA);
    await service.create(borrowerA);
    await service.create(borrowerB);

    const aList = await service.list(borrowerA);
    const bList = await service.list(borrowerB);

    expect(aList).toHaveLength(2);
    expect(bList).toHaveLength(1);
    expect(new Set(aList.map((a) => a.userId))).toEqual(new Set(['user_a']));
  });

  it("a borrower cannot fetch another borrower's application — and gets 404, not 403", async () => {
    const aApp = await service.create(borrowerA);

    await expect(service.getById(aApp.id, borrowerB)).rejects.toBeInstanceOf(NotFoundException);
    // Owner still succeeds:
    await expect(service.getById(aApp.id, borrowerA)).resolves.toMatchObject({ id: aApp.id });
  });

  it('staff can read any application and see the full list', async () => {
    const aApp = await service.create(borrowerA);
    await service.create(borrowerB);

    await expect(service.getById(aApp.id, loanOfficer)).resolves.toMatchObject({ id: aApp.id });
    await expect(service.list(loanOfficer)).resolves.toHaveLength(2);
  });

  it('updateStatus 404s on unknown ids', async () => {
    await expect(service.updateStatus('app_missing', 'SUBMITTED')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

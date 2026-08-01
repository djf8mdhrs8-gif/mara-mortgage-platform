import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { ScenariosService } from './scenarios.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface Row {
  id: string;
  userId: string;
  type: string;
  name: string;
  favorite: boolean;
  inputs: unknown;
  outputs: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakePrisma() {
  const rows: Row[] = [];
  let seq = 0;

  const prisma = {
    savedScenario: {
      create: ({ data }: { data: Omit<Row, 'id' | 'favorite' | 'createdAt' | 'updatedAt'> }) => {
        const row: Row = {
          ...data,
          id: `scn_${++seq}`,
          favorite: false,
          createdAt: new Date(2026, 0, seq), // deterministic, increasing
          updatedAt: new Date(2026, 0, seq),
        };
        rows.push(row);
        return Promise.resolve(row);
      },
      findMany: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(
          rows
            .filter((r) => r.userId === where.userId)
            .sort(
              (a, b) =>
                Number(b.favorite) - Number(a.favorite) ||
                b.createdAt.getTime() - a.createdAt.getTime(),
            ),
        ),
      update: ({ where, data }: { where: { id: string }; data: { favorite: boolean } }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row !== undefined) row.favorite = data.favorite;
        return Promise.resolve(row);
      },
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
      delete: ({ where }: { where: { id: string } }) => {
        const index = rows.findIndex((r) => r.id === where.id);
        if (index >= 0) rows.splice(index, 1);
        return Promise.resolve();
      },
    },
  } as unknown as PrismaService;

  return prisma;
}

const alice: AccessTokenPayload = { sub: 'user_a', role: 'BORROWER' };
const bob: AccessTokenPayload = { sub: 'user_b', role: 'BORROWER' };

// The well-known reference loan: $300k @ 7%/30yr → P&I $1,995.91.
const BASIC_INPUTS = {
  purchasePrice: 375_000,
  downPayment: { type: 'percent', value: 20 },
  annualRatePct: 7,
  termMonths: 360,
};

describe('ScenariosService', () => {
  let service: ScenariosService;

  beforeEach(() => {
    service = new ScenariosService(makeFakePrisma());
  });

  it('recomputes outputs server-side on save (client outputs never accepted)', async () => {
    const saved = await service.save(alice, {
      type: 'BASIC',
      name: 'Maple St',
      inputs: BASIC_INPUTS,
    });

    expect(saved.outputs).toMatchObject({
      loanAmount: 300_000,
      monthlyPrincipalInterest: 1_995.91,
    });
  });

  it('routes BUYDOWN to the temporary or permanent engine via inputs.mode', async () => {
    const temp = await service.save(alice, {
      type: 'BUYDOWN',
      name: '2-1 offer',
      inputs: { loanAmount: 300_000, annualRatePct: 7, termMonths: 360, type: '2-1' },
    });
    expect(temp.outputs).toMatchObject({ buydownCost: 6_992.52 });

    const perm = await service.save(alice, {
      type: 'BUYDOWN',
      name: 'points',
      inputs: {
        mode: 'permanent',
        loanAmount: 300_000,
        annualRatePct: 7,
        reducedRatePct: 6,
        termMonths: 360,
        cost: 6_000,
      },
    });
    expect(perm.outputs).toMatchObject({ monthlySavings: 197.26, breakEvenMonths: 31 });
  });

  it('strips month-by-month schedules from stored outputs', async () => {
    const saved = await service.save(alice, {
      type: 'EXTRA_PAYMENT',
      name: 'extra 200',
      inputs: { principal: 300_000, annualRatePct: 7, termMonths: 360, extraMonthly: 200 },
    });

    expect(saved.outputs).not.toHaveProperty('schedule');
    // The summary numbers survive.
    expect(saved.outputs).toHaveProperty('interestSaved');
    expect(saved.outputs).toHaveProperty('monthsSaved');
  });

  it('rejects inputs the engine cannot compute with 400', async () => {
    await expect(
      service.save(alice, { type: 'BASIC', name: 'bad', inputs: { purchasePrice: -5 } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(alice, { type: 'REFINANCE', name: 'empty', inputs: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists own scenarios newest-first and never other users’', async () => {
    await service.save(alice, { type: 'BASIC', name: 'first', inputs: BASIC_INPUTS });
    await service.save(alice, { type: 'BASIC', name: 'second', inputs: BASIC_INPUTS });
    await service.save(bob, { type: 'BASIC', name: 'bobs', inputs: BASIC_INPUTS });

    const aliceList = await service.list(alice);
    expect(aliceList.map((s) => s.name)).toEqual(['second', 'first']);
    expect(await service.list(bob)).toHaveLength(1);
  });

  it('favorites sort first and toggling is ownership-guarded', async () => {
    const first = await service.save(alice, { type: 'BASIC', name: 'old', inputs: BASIC_INPUTS });
    await service.save(alice, { type: 'BASIC', name: 'newer', inputs: BASIC_INPUTS });

    const updated = await service.update(first.id, alice, { favorite: true });
    expect(updated.favorite).toBe(true);

    // The older-but-favorited scenario now leads the list.
    expect((await service.list(alice)).map((s) => s.name)).toEqual(['old', 'newer']);

    await expect(service.update(first.id, bob, { favorite: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recomputeOutputs reproduces authoritative results (with schedules) from stored inputs', async () => {
    const saved = await service.save(alice, {
      type: 'EXTRA_PAYMENT',
      name: 'extra',
      inputs: { principal: 300_000, annualRatePct: 7, termMonths: 360, extraMonthly: 200 },
    });

    const outputs = service.recomputeOutputs(saved);
    expect(outputs).toHaveProperty('schedule'); // full recompute, unlike the stored copy
    expect(outputs).toMatchObject({ monthlyPayment: 1_995.91 });
  });

  it("getById/remove 404 on other users' scenarios; remove deletes own", async () => {
    const saved = await service.save(alice, { type: 'BASIC', name: 'mine', inputs: BASIC_INPUTS });

    await expect(service.getById(saved.id, bob)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(saved.id, bob)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getById(saved.id, alice)).resolves.toMatchObject({ name: 'mine' });

    await service.remove(saved.id, alice);
    await expect(service.getById(saved.id, alice)).rejects.toBeInstanceOf(NotFoundException);
  });
});

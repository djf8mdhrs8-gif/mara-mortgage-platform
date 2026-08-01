import { beforeEach, describe, expect, it } from 'vitest';

import { StatsService } from './stats.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface GroupByArgs {
  by: string[];
  where?: Record<string, unknown>;
  _count: { _all: true };
}

/** Generic in-memory groupBy/count over plain row arrays. */
function table<T extends Record<string, unknown>>(rows: T[]) {
  const matches = (row: T, where?: Record<string, unknown>): boolean => {
    if (where === undefined) return true;
    return Object.entries(where).every(([field, condition]) => {
      const value = row[field];
      if (condition !== null && typeof condition === 'object') {
        const c = condition as { in?: unknown[]; notIn?: unknown[] };
        if (c.in !== undefined) return c.in.includes(value);
        if (c.notIn !== undefined) return !c.notIn.includes(value);
      }
      return value === condition;
    });
  };
  return {
    count: ({ where }: { where?: Record<string, unknown> } = {}) =>
      Promise.resolve(rows.filter((r) => matches(r, where)).length),
    groupBy: ({ by, where }: GroupByArgs) => {
      const key = by[0]!;
      const groups = new Map<unknown, number>();
      for (const row of rows.filter((r) => matches(r, where))) {
        groups.set(row[key], (groups.get(row[key]) ?? 0) + 1);
      }
      return Promise.resolve(
        [...groups.entries()].map(([value, count]) => ({ [key]: value, _count: { _all: count } })),
      );
    },
  };
}

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    const prisma = {
      user: table([
        { role: 'BORROWER' },
        { role: 'BORROWER' },
        { role: 'REALTOR' },
        { role: 'LOAN_OFFICER' },
        { role: 'ADMIN' },
      ]),
      application: table([
        { userId: 'u1', status: 'DRAFT' },
        { userId: 'u1', status: 'UNDERWRITING' },
        { userId: 'u2', status: 'CLOSED' },
      ]),
      savedScenario: table([
        { userId: 'u1', type: 'BASIC' },
        { userId: 'u1', type: 'RENT_VS_BUY' },
        { userId: 'u3', type: 'BASIC' },
      ]),
      document: table([{ status: 'UPLOADED' }, { status: 'ACCEPTED' }]),
      message: table([{}, {}, {}]),
      notification: table([{ status: 'SENT' }, { status: 'FAILED' }, { status: 'SENT' }]),
    } as unknown as PrismaService;
    service = new StatsService(prisma);
  });

  it('tallies counts by role/status/type', async () => {
    const stats = await service.overview();

    expect(stats.users).toEqual({ BORROWER: 2, REALTOR: 1, LOAN_OFFICER: 1, ADMIN: 1 });
    expect(stats.applicationsByStatus).toEqual({ DRAFT: 1, UNDERWRITING: 1, CLOSED: 1 });
    expect(stats.scenariosByType).toEqual({ BASIC: 2, RENT_VS_BUY: 1 });
    expect(stats.documentsByStatus).toEqual({ UPLOADED: 1, ACCEPTED: 1 });
    expect(stats.messages).toBe(3);
    expect(stats.notifications).toBe(3);
    expect(stats.notificationsDelivered).toBe(2);
  });

  it('builds the funnel over distinct users at each stage', async () => {
    const stats = await service.overview();

    expect(stats.funnel).toEqual([
      { stage: 'Signed up', count: 3 }, // 2 borrowers + 1 realtor
      { stage: 'Saved a calculator scenario', count: 2 }, // u1, u3
      { stage: 'Started an application', count: 2 }, // u1, u2
      { stage: 'Submitted (in the pipeline)', count: 2 }, // u1 (underwriting), u2 (closed)
      { stage: 'Closed', count: 1 }, // u2
    ]);
  });
});

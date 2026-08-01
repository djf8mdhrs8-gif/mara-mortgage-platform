import { beforeEach, describe, expect, it } from 'vitest';

import { CalculatorConfigService } from './calculator-config.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface Row {
  key: string;
  enabled: boolean;
  data: unknown;
}

function makeFakePrisma() {
  const rows: Row[] = [];
  const prisma = {
    calculatorConfig: {
      findMany: () => Promise.resolve([...rows]),
      findUnique: ({ where }: { where: { key: string } }) =>
        Promise.resolve(rows.find((r) => r.key === where.key) ?? null),
      upsert: ({
        where,
        create,
        update,
      }: {
        where: { key: string };
        create: { key: string; enabled?: boolean; data?: unknown };
        update: { enabled?: boolean; data?: unknown };
      }) => {
        const existing = rows.find((r) => r.key === where.key);
        if (existing === undefined) {
          rows.push({ key: create.key, enabled: create.enabled ?? true, data: create.data ?? null });
        } else {
          Object.assign(existing, update);
        }
        return Promise.resolve(rows.find((r) => r.key === where.key));
      },
    },
  } as unknown as PrismaService;
  return prisma;
}

describe('CalculatorConfigService', () => {
  let service: CalculatorConfigService;

  beforeEach(() => {
    service = new CalculatorConfigService(makeFakePrisma());
  });

  it('returns code defaults when nothing is stored', async () => {
    const config = await service.get();

    expect(config.assumptions).toEqual({
      defaultRatePct: 6.5,
      pmiAnnualPct: 0.85,
      propertyTaxAnnualPct: 1.1,
      homeInsuranceAnnual: 1_500,
    });
    expect(config.calculators).toHaveLength(8);
    expect(config.calculators.every((c) => c.enabled)).toBe(true);
    expect(config.calculators.find((c) => c.key === 'buydown')?.title).toBe('Rate Buydown');
  });

  it('merges partial assumption edits over defaults and earlier edits', async () => {
    await service.update({ assumptions: { defaultRatePct: 5.99 } });
    const after = await service.update({ assumptions: { pmiAnnualPct: 0.6 } });

    // Both overrides survive; untouched keys stay at code defaults.
    expect(after.assumptions).toEqual({
      defaultRatePct: 5.99,
      pmiAnnualPct: 0.6,
      propertyTaxAnnualPct: 1.1,
      homeInsuranceAnnual: 1_500,
    });
  });

  it('toggles calculators individually and persists', async () => {
    const after = await service.update({
      calculators: [{ key: 'rent-vs-buy', enabled: false }],
    });

    expect(after.calculators.find((c) => c.key === 'rent-vs-buy')?.enabled).toBe(false);
    expect(after.calculators.filter((c) => c.enabled)).toHaveLength(7);

    const reEnabled = await service.update({
      calculators: [{ key: 'rent-vs-buy', enabled: true }],
    });
    expect(reEnabled.calculators.every((c) => c.enabled)).toBe(true);
  });
});

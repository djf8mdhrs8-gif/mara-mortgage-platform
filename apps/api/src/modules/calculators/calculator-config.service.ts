import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  AssumptionsDto,
  CALCULATOR_KEYS,
  CalculatorConfigDto,
  CalculatorToggleDto,
  type CalculatorKey,
} from './calculator-config.dto';
import { PrismaService } from '../../prisma/prisma.service';

const ASSUMPTIONS_KEY = 'assumptions';

/** Code defaults — what the app ships with until the admin overrides them. */
const DEFAULT_ASSUMPTIONS: Required<AssumptionsDto> = {
  defaultRatePct: 6.5,
  pmiAnnualPct: 0.85,
  propertyTaxAnnualPct: 1.1,
  homeInsuranceAnnual: 1_500,
};

const TITLES: Record<CalculatorKey, string> = {
  quick: 'Quick Quote',
  basic: 'Mortgage Payment',
  extra: 'Extra Payments',
  refinance: 'Refinance',
  affordability: 'Affordability',
  'rent-vs-buy': 'Rent vs. Buy',
  buydown: 'Rate Buydown',
  property: 'Property Analysis',
};

@Injectable()
export class CalculatorConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Effective config: DB overrides merged over code defaults. */
  async get(): Promise<CalculatorConfigDto> {
    const rows = await this.prisma.calculatorConfig.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    const stored = (byKey.get(ASSUMPTIONS_KEY)?.data ?? {}) as Partial<AssumptionsDto>;
    return {
      assumptions: { ...DEFAULT_ASSUMPTIONS, ...stored },
      calculators: CALCULATOR_KEYS.map((key) => ({
        key,
        title: TITLES[key],
        enabled: byKey.get(key)?.enabled ?? true,
      })),
    };
  }

  async update(input: {
    assumptions?: AssumptionsDto;
    calculators?: CalculatorToggleDto[];
  }): Promise<CalculatorConfigDto> {
    if (input.assumptions !== undefined) {
      // Merge with existing overrides so a partial edit doesn't reset the rest.
      const existing = await this.prisma.calculatorConfig.findUnique({
        where: { key: ASSUMPTIONS_KEY },
      });
      const merged = {
        ...((existing?.data ?? {}) as Partial<AssumptionsDto>),
        ...input.assumptions,
      } as Prisma.InputJsonValue;
      await this.prisma.calculatorConfig.upsert({
        where: { key: ASSUMPTIONS_KEY },
        create: { key: ASSUMPTIONS_KEY, data: merged },
        update: { data: merged },
      });
    }
    for (const toggle of input.calculators ?? []) {
      await this.prisma.calculatorConfig.upsert({
        where: { key: toggle.key },
        create: { key: toggle.key, enabled: toggle.enabled },
        update: { enabled: toggle.enabled },
      });
    }
    return this.get();
  }
}

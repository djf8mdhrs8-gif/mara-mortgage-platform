import { describe, expect, it } from 'vitest';

import { calculateAffordability } from '../affordability';

/** References from the documented 28/36 DTI method, computed independently (Milestone 18). */
describe('calculateAffordability', () => {
  it('A1: $96k income, $500 debts, $40k down, 6.5%/30yr, 1.2% tax, $1500 ins — front-end limited', () => {
    const r = calculateAffordability({
      annualIncome: 96_000,
      monthlyDebts: 500,
      downPayment: 40_000,
      annualRatePct: 6.5,
      propertyTaxAnnualPct: 1.2,
      homeInsuranceAnnual: 1500,
    });

    expect(r.frontEndCap).toBe(2240);
    expect(r.backEndCap).toBe(2380);
    expect(r.limitedBy).toBe('front-end');
    expect(r.maxHomePrice).toBe(323_443);
    expect(r.loanAmount).toBe(283_443);
    expect(r.monthlyPrincipalInterest).toBe(1791.55);
    expect(r.monthlyPropertyTax).toBe(323.44);
    // Total housing lands on the binding cap (± a cent from the price floor)
    expect(Math.abs(r.totalMonthly - 2240)).toBeLessThanOrEqual(0.02);
  });

  it('A2: $150k income, $1800 debts, $60k down, 7%/30yr, 1.0% tax, $1800 ins, $250 HOA — back-end limited', () => {
    const r = calculateAffordability({
      annualIncome: 150_000,
      monthlyDebts: 1800,
      downPayment: 60_000,
      annualRatePct: 7,
      propertyTaxAnnualPct: 1.0,
      homeInsuranceAnnual: 1800,
      hoaMonthly: 250,
    });

    expect(r.frontEndCap).toBe(3500);
    expect(r.backEndCap).toBe(2700);
    expect(r.limitedBy).toBe('back-end');
    expect(r.maxHomePrice).toBe(360_546);
    expect(r.loanAmount).toBe(300_546);
    expect(r.monthlyPrincipalInterest).toBe(1999.54);
    expect(Math.abs(r.totalMonthly - 2700)).toBeLessThanOrEqual(0.02);
  });

  it('zero rate inverts with the linear factor', () => {
    const r = calculateAffordability({
      annualIncome: 60_000,
      monthlyDebts: 0,
      downPayment: 0,
      annualRatePct: 0,
      propertyTaxAnnualPct: 0,
      homeInsuranceAnnual: 0,
    });
    // budget = 1400/mo, all P&I: price = 1400 × 360
    expect(r.maxHomePrice).toBe(504_000);
    expect(r.totalMonthly).toBe(1400);
  });

  it('throws when debts consume the entire back-end budget', () => {
    expect(() =>
      calculateAffordability({
        annualIncome: 48_000,
        monthlyDebts: 1500,
        downPayment: 10_000,
        annualRatePct: 6.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects nonsense inputs', () => {
    expect(() =>
      calculateAffordability({
        annualIncome: 0,
        monthlyDebts: 0,
        downPayment: 0,
        annualRatePct: 6,
      }),
    ).toThrow(RangeError);
  });
});

import { describe, expect, it } from 'vitest';

import { calculateAffordability } from '../affordability';

/**
 * A1/A2 references from the documented 28/36 DTI method, computed
 * independently (Milestone 18) — they pass the classic ratios explicitly.
 * The DEFAULT ratios are 45/50 (Mara's qualifying ratios) — covered below.
 */
describe('calculateAffordability', () => {
  it('A1: $96k income, $500 debts, $40k down, 6.5%/30yr, 1.2% tax, $1500 ins — front-end limited at 28/36', () => {
    const r = calculateAffordability({
      annualIncome: 96_000,
      monthlyDebts: 500,
      downPayment: 40_000,
      annualRatePct: 6.5,
      propertyTaxAnnualPct: 1.2,
      homeInsuranceAnnual: 1500,
      frontEndPct: 28,
      backEndPct: 36,
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

  it('A2: $150k income, $1800 debts, $60k down, 7%/30yr, 1.0% tax, $1800 ins, $250 HOA — back-end limited at 28/36', () => {
    const r = calculateAffordability({
      annualIncome: 150_000,
      monthlyDebts: 1800,
      downPayment: 60_000,
      annualRatePct: 7,
      propertyTaxAnnualPct: 1.0,
      homeInsuranceAnnual: 1800,
      hoaMonthly: 250,
      frontEndPct: 28,
      backEndPct: 36,
    });

    expect(r.frontEndCap).toBe(3500);
    expect(r.backEndCap).toBe(2700);
    expect(r.limitedBy).toBe('back-end');
    expect(r.maxHomePrice).toBe(360_546);
    expect(r.loanAmount).toBe(300_546);
    expect(r.monthlyPrincipalInterest).toBe(1999.54);
    expect(Math.abs(r.totalMonthly - 2700)).toBeLessThanOrEqual(0.02);
  });

  it('defaults to the 45/50 qualifying ratios', () => {
    // $96k income → $8,000/mo: front cap 45% = $3,600; back cap 50% = $4,000
    // − $500 debts = $3,500 → back-end limited under the default ratios.
    const r = calculateAffordability({
      annualIncome: 96_000,
      monthlyDebts: 500,
      downPayment: 40_000,
      annualRatePct: 6.5,
      propertyTaxAnnualPct: 1.2,
      homeInsuranceAnnual: 1500,
    });

    expect(r.frontEndCap).toBe(3600);
    expect(r.backEndCap).toBe(3500);
    expect(r.limitedBy).toBe('back-end');
    // Wider ratios must never shrink buying power vs the classic 28/36 (A1).
    expect(r.maxHomePrice).toBeGreaterThan(323_443);
    expect(Math.abs(r.totalMonthly - 3500)).toBeLessThanOrEqual(0.02);
  });

  it('zero rate inverts with the linear factor (45/50 defaults)', () => {
    const r = calculateAffordability({
      annualIncome: 60_000,
      monthlyDebts: 0,
      downPayment: 0,
      annualRatePct: 0,
      propertyTaxAnnualPct: 0,
      homeInsuranceAnnual: 0,
    });
    // budget = min(45%, 50%) of $5,000 = $2,250/mo, all P&I: price = 2,250 × 360
    expect(r.maxHomePrice).toBe(810_000);
    expect(r.totalMonthly).toBe(2250);
  });

  it('throws when debts consume the entire back-end budget', () => {
    expect(() =>
      calculateAffordability({
        annualIncome: 48_000,
        monthlyDebts: 2100, // 50% of $4,000/mo = $2,000 — fully consumed
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

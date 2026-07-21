import { describe, expect, it } from 'vitest';

import { calculateBasicMortgage } from '../basic';

/**
 * Reference scenarios computed independently with Python Decimal
 * (see Milestone 14 verification). P&I values also cross-check against
 * the amortization engine's published-table-verified payments.
 */
describe('calculateBasicMortgage', () => {
  it('Scenario A: $250k, 20% down, 6.5%/30yr, tax $3600, ins $1200, PMI rate set but LTV=80 → no PMI', () => {
    const r = calculateBasicMortgage({
      purchasePrice: 250_000,
      downPayment: { type: 'percent', value: 20 },
      annualRatePct: 6.5,
      termMonths: 360,
      propertyTaxAnnual: 3600,
      homeInsuranceAnnual: 1200,
      pmiAnnualPct: 0.5,
      closingCosts: 5000,
    });

    expect(r.downPaymentAmount).toBe(50_000);
    expect(r.loanAmount).toBe(200_000);
    expect(r.ltvPct).toBe(80);
    expect(r.monthlyPrincipalInterest).toBe(1264.14);
    expect(r.monthlyPropertyTax).toBe(300);
    expect(r.monthlyInsurance).toBe(100);
    expect(r.monthlyPmi).toBe(0); // LTV is exactly 80 — PMI must NOT apply
    expect(r.totalMonthly).toBe(1664.14);
    expect(r.cashToClose).toBe(55_000);
  });

  it('Scenario B: $300k, 3.5% down, 7%/30yr, tax $4800, ins $1500, HOA $50, PMI 0.85%', () => {
    const r = calculateBasicMortgage({
      purchasePrice: 300_000,
      downPayment: { type: 'percent', value: 3.5 },
      annualRatePct: 7,
      termMonths: 360,
      propertyTaxAnnual: 4800,
      homeInsuranceAnnual: 1500,
      hoaMonthly: 50,
      pmiAnnualPct: 0.85,
      closingCosts: 6000,
    });

    expect(r.downPaymentAmount).toBe(10_500);
    expect(r.loanAmount).toBe(289_500);
    expect(r.ltvPct).toBe(96.5);
    expect(r.monthlyPrincipalInterest).toBe(1926.05);
    expect(r.monthlyPmi).toBe(205.06);
    expect(r.totalMonthly).toBe(2706.11);
    expect(r.cashToClose).toBe(16_500);
  });

  it('Scenario C: $500k, $100k down, 5.25%/15yr, tax $9000, ins $2400, HOA $250', () => {
    const r = calculateBasicMortgage({
      purchasePrice: 500_000,
      downPayment: { type: 'amount', value: 100_000 },
      annualRatePct: 5.25,
      termMonths: 180,
      propertyTaxAnnual: 9000,
      homeInsuranceAnnual: 2400,
      hoaMonthly: 250,
      closingCosts: 8000,
    });

    expect(r.loanAmount).toBe(400_000);
    expect(r.monthlyPrincipalInterest).toBe(3215.51);
    expect(r.totalMonthly).toBe(4415.51);
    expect(r.cashToClose).toBe(108_000);
  });

  it('rejects a down payment that consumes the whole price', () => {
    expect(() =>
      calculateBasicMortgage({
        purchasePrice: 200_000,
        downPayment: { type: 'percent', value: 100 },
        annualRatePct: 6,
        termMonths: 360,
      }),
    ).toThrow(RangeError);
  });

  it('rejects negative extras', () => {
    expect(() =>
      calculateBasicMortgage({
        purchasePrice: 200_000,
        downPayment: { type: 'percent', value: 20 },
        annualRatePct: 6,
        termMonths: 360,
        hoaMonthly: -5,
      }),
    ).toThrow(RangeError);
  });
});

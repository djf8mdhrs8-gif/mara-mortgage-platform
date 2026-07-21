import { describe, expect, it } from 'vitest';

import { calculateRefinance } from '../refinance';

/** References computed independently with Python Decimal (Milestone 17). */
describe('calculateRefinance', () => {
  it('R1: $250k @ 7.5% (300mo left) → 6.25%/30yr, $6k closing paid cash', () => {
    const r = calculateRefinance({
      currentBalance: 250_000,
      currentRatePct: 7.5,
      currentRemainingMonths: 300,
      newRatePct: 6.25,
      newTermMonths: 360,
      closingCosts: 6000,
    });

    expect(r.currentPayment).toBe(1847.48);
    expect(r.newPayment).toBe(1539.29);
    expect(r.monthlySavings).toBe(308.19);
    // Manual check: ceil(6000 / 308.19) = ceil(19.47) = 20 months
    expect(r.breakEvenMonths).toBe(20);
    expect(r.currentTotalRemainingInterest).toBe(304_242.36);
    expect(r.newTotalInterest).toBe(304_147.73);
    expect(r.interestSavings).toBe(94.63);
    expect(r.currentTotalRemainingCost).toBe(554_242.36);
    expect(r.newTotalCost).toBe(560_147.73);
    // Honest output: restarting a 30yr clock costs MORE overall despite lower payment
    expect(r.lifetimeSavings).toBe(-5905.37);
  });

  it('R2: $180k @ 6.875% (240mo left) → 5.5%/15yr, $4.5k closing financed', () => {
    const r = calculateRefinance({
      currentBalance: 180_000,
      currentRatePct: 6.875,
      currentRemainingMonths: 240,
      newRatePct: 5.5,
      newTermMonths: 180,
      closingCosts: 4500,
      financeClosingCosts: true,
    });

    expect(r.newLoanAmount).toBe(184_500);
    expect(r.currentPayment).toBe(1382.06);
    expect(r.newPayment).toBe(1507.52);
    expect(r.monthlySavings).toBe(-125.46);
    // Payment goes UP — there is no monthly-savings break-even
    expect(r.breakEvenMonths).toBeNull();
    // Verified with exact-rational arithmetic (Python Fraction); the Decimal
    // reference was a cent off from 28-digit rate truncation.
    expect(r.interestSavings).toBe(64_843.54);
    expect(r.newTotalCost).toBe(271_353.27);
    expect(r.lifetimeSavings).toBe(60_343.54);
  });

  it('zero closing costs with positive savings → break-even at month 0', () => {
    const r = calculateRefinance({
      currentBalance: 200_000,
      currentRatePct: 7,
      currentRemainingMonths: 300,
      newRatePct: 6,
      newTermMonths: 300,
    });
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakEvenMonths).toBe(0);
  });

  it('rejects negative closing costs', () => {
    expect(() =>
      calculateRefinance({
        currentBalance: 200_000,
        currentRatePct: 7,
        currentRemainingMonths: 300,
        newRatePct: 6,
        newTermMonths: 360,
        closingCosts: -1,
      }),
    ).toThrow(RangeError);
  });
});

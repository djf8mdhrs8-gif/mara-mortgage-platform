import { describe, expect, it } from 'vitest';

import { calculatePermanentBuydown, calculateTemporaryBuydown } from '../buydown';

/**
 * Reference payments below are the standard published values for a $300,000
 * 30-year loan (checkable against any lender table):
 *   7% → $1,995.91   6% → $1,798.65   5% → $1,610.46   4% → $1,432.25
 */
describe('calculateTemporaryBuydown', () => {
  it('computes the 2-1 schedule and subsidy cost for a $300k 30-year 7% loan', () => {
    const result = calculateTemporaryBuydown({
      loanAmount: 300_000,
      annualRatePct: 7,
      termMonths: 360,
      type: '2-1',
    });

    expect(result.notePayment).toBe(1_995.91);
    expect(result.years).toEqual([
      {
        year: 1,
        ratePct: 5,
        payment: 1_610.46,
        monthlySavings: 385.45, // 1,995.91 − 1,610.46
        yearlySavings: 4_625.4,
      },
      {
        year: 2,
        ratePct: 6,
        payment: 1_798.65,
        monthlySavings: 197.26,
        yearlySavings: 2_367.12,
      },
    ]);
    expect(result.buydownCost).toBe(6_992.52); // 4,625.40 + 2,367.12
  });

  it('computes the 3-2-1 schedule for the same loan', () => {
    const result = calculateTemporaryBuydown({
      loanAmount: 300_000,
      annualRatePct: 7,
      termMonths: 360,
      type: '3-2-1',
    });

    expect(result.years.map((y) => y.ratePct)).toEqual([4, 5, 6]);
    expect(result.years[0]).toMatchObject({
      payment: 1_432.25,
      monthlySavings: 563.66,
      yearlySavings: 6_763.92,
    });
    expect(result.buydownCost).toBe(13_756.44); // 6,763.92 + 4,625.40 + 2,367.12
  });

  it('computes the 1-0 schedule: one subsidized year at note − 1%', () => {
    const result = calculateTemporaryBuydown({
      loanAmount: 300_000,
      annualRatePct: 7,
      termMonths: 360,
      type: '1-0',
    });

    expect(result.years).toEqual([
      {
        year: 1,
        ratePct: 6,
        payment: 1_798.65,
        monthlySavings: 197.26,
        yearlySavings: 2_367.12,
      },
    ]);
    expect(result.buydownCost).toBe(2_367.12);
    expect(result.notePayment).toBe(1_995.91);
  });

  it('rejects loans that cannot support the buydown', () => {
    const base = { loanAmount: 300_000, termMonths: 360 } as const;
    // Note rate below the largest step would need a negative rate.
    expect(() =>
      calculateTemporaryBuydown({ ...base, annualRatePct: 1.5, type: '2-1' }),
    ).toThrow(RangeError);
    // Term shorter than the buydown period.
    expect(() =>
      calculateTemporaryBuydown({
        loanAmount: 300_000,
        annualRatePct: 7,
        termMonths: 24,
        type: '3-2-1',
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTemporaryBuydown({ ...base, annualRatePct: 0, type: '2-1' }),
    ).toThrow(RangeError);
  });
});

describe('calculatePermanentBuydown', () => {
  it('computes savings and break-even for buying 7% down to 6% with $6,000 in points', () => {
    const result = calculatePermanentBuydown({
      loanAmount: 300_000,
      annualRatePct: 7,
      reducedRatePct: 6,
      termMonths: 360,
      cost: 6_000,
    });

    expect(result.notePayment).toBe(1_995.91);
    expect(result.reducedPayment).toBe(1_798.65);
    expect(result.monthlySavings).toBe(197.26);
    // ceil(6,000 / 197.26) = ceil(30.42) = 31 months.
    expect(result.breakEvenMonths).toBe(31);
    // Interest ≈ payment·360 − principal; exact cents come from the
    // schedule's final-payment settlement, so compare within a dollar.
    expect(result.noteTotalInterest).toBeCloseTo(1_995.91 * 360 - 300_000, -1);
    expect(result.reducedTotalInterest).toBeCloseTo(1_798.65 * 360 - 300_000, -1);
    expect(result.lifetimeInterestSavings).toBeCloseTo(
      result.noteTotalInterest - result.reducedTotalInterest,
      2,
    );
    expect(result.lifetimeInterestSavings).toBeGreaterThan(70_000);
  });

  it('rejects invalid rate and cost combinations', () => {
    const base = {
      loanAmount: 300_000,
      annualRatePct: 7,
      reducedRatePct: 6,
      termMonths: 360,
      cost: 6_000,
    };

    expect(() => calculatePermanentBuydown({ ...base, reducedRatePct: 7 })).toThrow(RangeError);
    expect(() => calculatePermanentBuydown({ ...base, reducedRatePct: 8 })).toThrow(RangeError);
    expect(() => calculatePermanentBuydown({ ...base, reducedRatePct: -1 })).toThrow(RangeError);
    expect(() => calculatePermanentBuydown({ ...base, cost: 0 })).toThrow(RangeError);
    expect(() => calculatePermanentBuydown({ ...base, loanAmount: 0 })).toThrow(RangeError);
  });
});

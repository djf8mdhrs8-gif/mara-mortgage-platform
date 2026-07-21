import { describe, expect, it } from 'vitest';

import { buildAmortization, monthlyPayment } from '../amortization';

/**
 * Reference values computed independently with Python's Decimal
 * (ROUND_HALF_UP, per-row cent rounding, final payment settles the balance).
 * The first four monthly payments also match widely published mortgage
 * tables ($599.55, $1,264.14, $1,995.91, $843.86).
 */
const REFERENCES = [
  {
    name: '$100,000 @ 6% / 30yr (classic textbook case)',
    params: { principal: 100_000, annualRatePct: 6, termMonths: 360 },
    monthlyPayment: 599.55,
    firstInterest: 500.0,
    firstPrincipal: 99.55,
    firstBalance: 99_900.45,
    totalInterest: 115_838.45,
    totalPaid: 215_838.45,
    payoffMonths: 361, // rounded payment undershoots by pennies → tiny extra payment
  },
  {
    name: '$200,000 @ 6.5% / 30yr',
    params: { principal: 200_000, annualRatePct: 6.5, termMonths: 360 },
    monthlyPayment: 1264.14,
    firstInterest: 1083.33,
    firstPrincipal: 180.81,
    firstBalance: 199_819.19,
    totalInterest: 255_085.82,
    totalPaid: 455_085.82,
    payoffMonths: 360,
  },
  {
    name: '$300,000 @ 7% / 30yr',
    params: { principal: 300_000, annualRatePct: 7, termMonths: 360 },
    monthlyPayment: 1995.91,
    firstInterest: 1750.0,
    firstPrincipal: 245.91,
    firstBalance: 299_754.09,
    totalInterest: 418_524.05,
    totalPaid: 718_524.05,
    payoffMonths: 360,
  },
  {
    name: '$100,000 @ 6% / 15yr',
    params: { principal: 100_000, annualRatePct: 6, termMonths: 180 },
    monthlyPayment: 843.86,
    firstInterest: 500.0,
    firstPrincipal: 343.86,
    firstBalance: 99_656.14,
    totalInterest: 51_893.8,
    totalPaid: 151_893.8,
    payoffMonths: 180,
  },
  {
    name: '$250,000 @ 5.25% / 15yr',
    params: { principal: 250_000, annualRatePct: 5.25, termMonths: 180 },
    monthlyPayment: 2009.69,
    firstInterest: 1093.75,
    firstPrincipal: 915.94,
    firstBalance: 249_084.06,
    totalInterest: 111_745.42,
    totalPaid: 361_745.42,
    payoffMonths: 181,
  },
  {
    name: '$120,000 @ 0% / 30yr (zero-rate edge case)',
    params: { principal: 120_000, annualRatePct: 0, termMonths: 360 },
    monthlyPayment: 333.33,
    firstInterest: 0,
    firstPrincipal: 333.33,
    firstBalance: 119_666.67,
    totalInterest: 0,
    totalPaid: 120_000.0,
    payoffMonths: 361, // 333.33 × 360 leaves $1.20 → one settling payment
  },
] as const;

describe('monthlyPayment', () => {
  for (const ref of REFERENCES) {
    it(`matches the reference payment for ${ref.name}`, () => {
      expect(monthlyPayment(ref.params)).toBe(ref.monthlyPayment);
    });
  }

  it('rejects invalid inputs', () => {
    expect(() => monthlyPayment({ principal: 0, annualRatePct: 6, termMonths: 360 })).toThrow(
      RangeError,
    );
    expect(() => monthlyPayment({ principal: 100000, annualRatePct: -1, termMonths: 360 })).toThrow(
      RangeError,
    );
    expect(() =>
      monthlyPayment({ principal: 100000, annualRatePct: 6, termMonths: 359.5 }),
    ).toThrow(RangeError);
  });
});

describe('buildAmortization', () => {
  for (const ref of REFERENCES) {
    it(`matches the reference schedule to the cent for ${ref.name}`, () => {
      const result = buildAmortization(ref.params);
      const first = result.schedule[0];

      expect(result.monthlyPayment).toBe(ref.monthlyPayment);
      expect(first?.interest).toBe(ref.firstInterest);
      expect(first?.principal).toBe(ref.firstPrincipal);
      expect(first?.balance).toBe(ref.firstBalance);
      expect(result.totalInterest).toBe(ref.totalInterest);
      expect(result.totalPaid).toBe(ref.totalPaid);
      expect(result.payoffMonths).toBe(ref.payoffMonths);
    });
  }

  it('maintains schedule invariants (every row self-consistent, balance strictly decreasing to zero)', () => {
    const { schedule, totalPaid, totalInterest } = buildAmortization({
      principal: 200_000,
      annualRatePct: 6.5,
      termMonths: 360,
    });

    let prevBalance = 200_000;
    let paidSum = 0;
    let interestSum = 0;
    for (const row of schedule) {
      // payment = interest + principal, to the cent
      expect(Math.round((row.interest + row.principal) * 100)).toBe(
        Math.round(row.payment * 100),
      );
      // balance decreases by exactly the principal portion
      expect(Math.round((prevBalance - row.principal) * 100)).toBe(
        Math.round(row.balance * 100),
      );
      expect(row.balance).toBeLessThan(prevBalance);
      prevBalance = row.balance;
      paidSum += Math.round(row.payment * 100);
      interestSum += Math.round(row.interest * 100);
    }

    expect(schedule.at(-1)?.balance).toBe(0);
    expect(paidSum).toBe(Math.round(totalPaid * 100));
    expect(interestSum).toBe(Math.round(totalInterest * 100));
  });

  it('total paid always equals principal + total interest, across a parameter sweep', () => {
    for (const principal of [50_000, 175_500.5, 423_750]) {
      for (const rate of [0, 2.75, 4.5, 6.125, 8.99]) {
        for (const term of [120, 180, 240, 360]) {
          const r = buildAmortization({ principal, annualRatePct: rate, termMonths: term });
          const principalCents = Math.round(principal * 100);
          expect(Math.round(r.totalPaid * 100) - Math.round(r.totalInterest * 100)).toBe(
            principalCents,
          );
          expect(Math.abs(r.payoffMonths - term)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

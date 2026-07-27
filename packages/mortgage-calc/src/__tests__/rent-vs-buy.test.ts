import { describe, expect, it } from 'vitest';

import { calculateRentVsBuy } from '../rent-vs-buy';

/**
 * References below are computed by hand with zero-rate loans and zero-growth
 * assumptions wherever a value is asserted exactly, so every expected number
 * can be checked with pencil and paper — nothing is regression-snapshotted
 * from the implementation itself.
 */
describe('calculateRentVsBuy', () => {
  it('all-flat sanity: equal cash flows leave the renter static while equity builds', () => {
    // 0% loan: P&I = 60,000 / 120 = $500 — identical to rent, so no side ever
    // invests a monthly surplus and the renter just holds the $60k outlay.
    const result = calculateRentVsBuy({
      purchasePrice: 120_000,
      downPayment: { type: 'amount', value: 60_000 },
      annualRatePct: 0,
      termMonths: 120,
      horizonYears: 2,
      monthlyRent: 500,
    });

    expect(result.monthlyPrincipalInterest).toBe(500);
    expect(result.initialBuyerOutlay).toBe(60_000);

    // Year 1: balance 60,000 − 12·500 = 54,000; wealth = 120,000 − 54,000.
    expect(result.years[0]).toMatchObject({
      year: 1,
      homeValue: 120_000,
      loanBalance: 54_000,
      buyerNetWealth: 66_000,
      renterNetWealth: 60_000,
      buyerCostYear: 6_000,
      renterCostYear: 6_000,
    });
    // Year 2: balance 48,000 → wealth 72,000; renter unchanged at 0% return.
    expect(result.years[1]).toMatchObject({
      year: 2,
      loanBalance: 48_000,
      buyerNetWealth: 72_000,
      renterNetWealth: 60_000,
    });
    expect(result.breakEvenYear).toBe(1);
    expect(result.wealthDifference).toBe(12_000);
  });

  it('invests the renter surplus when owning costs more', () => {
    // Maintenance 1%/yr of value = $100/mo on top of $500 P&I → the renter
    // banks $100 every month at 0% return.
    const result = calculateRentVsBuy({
      purchasePrice: 120_000,
      downPayment: { type: 'amount', value: 60_000 },
      annualRatePct: 0,
      termMonths: 120,
      horizonYears: 1,
      monthlyRent: 500,
      maintenanceAnnualPct: 1,
    });

    expect(result.years[0]).toMatchObject({
      buyerCostYear: 7_200, // 12 · (500 + 100)
      renterCostYear: 6_000,
      renterNetWealth: 61_200, // 60,000 + 12 · 100
      buyerNetWealth: 66_000, // unchanged by maintenance
    });
  });

  it('marks the home to market net of selling costs', () => {
    // 3% appreciation, 6% selling costs:
    // value 103,000 → proceeds 103,000·0.94 = 96,820; balance 44,000.
    const result = calculateRentVsBuy({
      purchasePrice: 100_000,
      downPayment: { type: 'amount', value: 50_000 },
      annualRatePct: 0,
      termMonths: 100,
      horizonYears: 1,
      monthlyRent: 500,
      homeAppreciationPct: 3,
      sellClosingCostsPct: 6,
    });

    expect(result.years[0]).toMatchObject({
      homeValue: 103_000,
      loanBalance: 44_000,
      buyerNetWealth: 52_820, // 96,820 − 44,000
      renterNetWealth: 50_000,
    });
  });

  it('grows rent annually and counts the buyer closing costs in the renter stake', () => {
    // Rent 1,000 at 10%/yr → 1,000 / 1,100 / 1,210 across three years.
    // Buyer closing costs 2% of 100,000 = 2,000 join the renter's investment.
    const result = calculateRentVsBuy({
      purchasePrice: 100_000,
      downPayment: { type: 'amount', value: 50_000 },
      annualRatePct: 0,
      termMonths: 300,
      horizonYears: 3,
      monthlyRent: 1_000,
      rentGrowthPct: 10,
      buyClosingCostsPct: 2,
    });

    expect(result.initialBuyerOutlay).toBe(52_000);
    expect(result.years.map((y) => y.monthlyRent)).toEqual([1_000, 1_100, 1_210]);
    expect(result.years.map((y) => y.renterCostYear)).toEqual([12_000, 13_200, 14_520]);
    // Rent (1,000) far exceeds the $166.67 P&I → the BUYER invests the
    // difference; the renter's stake stays at the initial 52,000.
    expect(result.years[0]?.renterNetWealth).toBe(52_000);
  });

  it('compounds invested cash at the annual return (monthly compounding)', () => {
    // Equal monthly cash flows → the only motion is the renter's initial
    // 60,000 compounding at 12%/yr. Per-month cent rounding allows a few
    // cents of drift from the exact 67,200.
    const result = calculateRentVsBuy({
      purchasePrice: 120_000,
      downPayment: { type: 'amount', value: 60_000 },
      annualRatePct: 0,
      termMonths: 120,
      horizonYears: 1,
      monthlyRent: 500,
      investmentReturnPct: 12,
    });

    expect(result.years[0]!.renterNetWealth).toBeCloseTo(67_200, 1);
  });

  it('charges PMI only while the balance exceeds 80% of the purchase price', () => {
    // Loan 90,000 on 100,000 price, 0% over 90 months → $1,000/mo principal.
    // Balance before payment n is 90,000 − 1,000(n−1) > 80,000 ⇔ n ≤ 10,
    // so exactly 10 months of PMI at 90,000·1.2%/12 = $90.
    const result = calculateRentVsBuy({
      purchasePrice: 100_000,
      downPayment: { type: 'percent', value: 10 },
      annualRatePct: 0,
      termMonths: 90,
      horizonYears: 1,
      monthlyRent: 500,
      pmiAnnualPct: 1.2,
    });

    expect(result.loanAmount).toBe(90_000);
    expect(result.years[0]?.buyerCostYear).toBe(12_900); // 12,000 P&I + 10 · 90 PMI
  });

  it('keeps projecting after the loan is paid off (P&I stops, balance stays 0)', () => {
    const result = calculateRentVsBuy({
      purchasePrice: 100_000,
      downPayment: { type: 'amount', value: 50_000 },
      annualRatePct: 0,
      termMonths: 12, // paid off after year 1
      horizonYears: 2,
      monthlyRent: 100,
    });

    expect(result.years[0]?.loanBalance).toBe(0);
    // Year 2: no P&I at all; rent 100 < buyer cost 0 is false — buyer cost is
    // 0, so the buyer invests the 100 difference... rent > 0 = buyer banks it.
    expect(result.years[1]?.buyerCostYear).toBe(0);
    expect(result.years[1]?.loanBalance).toBe(0);
    // Buyer wealth year 2 = full home value + 12 months of banked rent diff
    // (from year 2) + year-1 banked differences (50,000/12 P&I vs 100 rent →
    // renter banked, not buyer). Just assert monotonic dominance here:
    expect(result.years[1]!.buyerNetWealth).toBeGreaterThan(result.years[0]!.buyerNetWealth);
  });

  it('rejects invalid inputs', () => {
    const base = {
      purchasePrice: 100_000,
      downPayment: { type: 'amount', value: 20_000 } as const,
      annualRatePct: 6,
      termMonths: 360,
      horizonYears: 10,
      monthlyRent: 1_500,
    };

    expect(() => calculateRentVsBuy({ ...base, horizonYears: 0 })).toThrow(RangeError);
    expect(() => calculateRentVsBuy({ ...base, horizonYears: 51 })).toThrow(RangeError);
    expect(() => calculateRentVsBuy({ ...base, monthlyRent: 0 })).toThrow(RangeError);
    expect(() => calculateRentVsBuy({ ...base, homeAppreciationPct: -100 })).toThrow(RangeError);
    expect(() => calculateRentVsBuy({ ...base, sellClosingCostsPct: 100 })).toThrow(RangeError);
    expect(() => calculateRentVsBuy({ ...base, rentGrowthPct: -1 })).toThrow(RangeError);
    expect(() =>
      calculateRentVsBuy({ ...base, downPayment: { type: 'amount', value: 100_000 } }),
    ).toThrow(RangeError);
  });
});

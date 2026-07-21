import { describe, expect, it } from 'vitest';

import { buildAmortization } from '../amortization';
import { buildExtraPaymentPlan } from '../extra-payment';

/** References computed independently with Python Decimal (Milestone 16). */
describe('buildExtraPaymentPlan', () => {
  it('S1: $200k @ 6.5%/30yr with $200/mo extra — saves 110 months and $90,074.66', () => {
    const r = buildExtraPaymentPlan({
      principal: 200_000,
      annualRatePct: 6.5,
      termMonths: 360,
      extraMonthly: 200,
    });

    expect(r.monthlyPayment).toBe(1264.14);
    expect(r.payoffMonths).toBe(250);
    expect(r.totalInterest).toBe(165_011.16);
    expect(r.totalPaid).toBe(365_011.16);
    expect(r.baseline.payoffMonths).toBe(360);
    expect(r.baseline.totalInterest).toBe(255_085.82);
    expect(r.monthsSaved).toBe(110);
    expect(r.interestSaved).toBe(90_074.66);
  });

  it('S2: $300k @ 7%/30yr with $100/mo + $1,000/yr + $10k one-time at month 24 — saves 98 months and $140,035.84', () => {
    const r = buildExtraPaymentPlan({
      principal: 300_000,
      annualRatePct: 7,
      termMonths: 360,
      extraMonthly: 100,
      extraAnnual: 1000,
      oneTime: { amount: 10_000, month: 24 },
    });

    expect(r.payoffMonths).toBe(262);
    expect(r.totalInterest).toBe(278_488.21);
    expect(r.monthsSaved).toBe(98);
    expect(r.interestSaved).toBe(140_035.84);
  });

  it('no extras → identical to the plain amortization', () => {
    const params = { principal: 150_000, annualRatePct: 5.5, termMonths: 240 };
    const plain = buildAmortization(params);
    const plan = buildExtraPaymentPlan(params);

    expect(plan.payoffMonths).toBe(plain.payoffMonths);
    expect(plan.totalInterest).toBe(plain.totalInterest);
    expect(plan.monthsSaved).toBe(0);
    expect(plan.interestSaved).toBe(0);
  });

  it('extra payments preserve row invariants (interest + principal = paid)', () => {
    const r = buildExtraPaymentPlan({
      principal: 100_000,
      annualRatePct: 6,
      termMonths: 360,
      extraMonthly: 150,
      extraAnnual: 500,
    });
    for (const row of r.schedule) {
      expect(Math.round((row.interest + row.principal) * 100)).toBe(
        Math.round(row.payment * 100),
      );
    }
    expect(r.schedule.at(-1)?.balance).toBe(0);
  });

  it('rejects negative extras and invalid one-time months', () => {
    const base = { principal: 100_000, annualRatePct: 6, termMonths: 360 };
    expect(() => buildExtraPaymentPlan({ ...base, extraMonthly: -1 })).toThrow(RangeError);
    expect(() =>
      buildExtraPaymentPlan({ ...base, oneTime: { amount: 100, month: 0 } }),
    ).toThrow(RangeError);
  });
});

import { describe, expect, it } from 'vitest';

import { calculateBasicMortgage } from '../basic';
import { analyzeProperty } from '../property-analysis';

// $375,000 property; 20% down leaves the well-known $300,000 @ 7%/30yr loan
// (P&I $1,995.91 — standard published value used across this suite).
const PROPERTY = {
  purchasePrice: 375_000,
  annualRatePct: 7,
  termMonths: 360,
  propertyTaxAnnual: 3_600, // $300/mo
  homeInsuranceAnnual: 1_200, // $100/mo
  hoaMonthly: 50,
  pmiAnnualPct: 1,
  closingCosts: 5_000,
};

describe('analyzeProperty', () => {
  it('hand-checks the 20% tier: no PMI, published P&I, full carrying costs', () => {
    const { options } = analyzeProperty(PROPERTY);
    const tier20 = options.find((o) => o.downPct === 20)!;

    expect(tier20).toMatchObject({
      downPaymentAmount: 75_000,
      loanAmount: 300_000,
      ltvPct: 80,
      monthlyPrincipalInterest: 1_995.91,
      monthlyPropertyTax: 300,
      monthlyInsurance: 100,
      monthlyHoa: 50,
      monthlyPmi: 0, // LTV is exactly 80 — PMI threshold is > 80
      totalMonthly: 2_445.91, // 1,995.91 + 300 + 100 + 50
      cashToClose: 80_000, // 75,000 down + 5,000 closing
    });
  });

  it('charges PMI on the low-down tiers and drops it at 80% LTV', () => {
    const { options } = analyzeProperty(PROPERTY);
    const [fha, ten, twenty] = options;

    // 10% down: loan 337,500 → PMI = 337,500 · 1% / 12 = $281.25 exactly.
    expect(ten?.loanAmount).toBe(337_500);
    expect(ten?.monthlyPmi).toBe(281.25);
    // 3.5% down: loan 361,875 → PMI = 361,875 · 1% / 12 = $301.5625 → $301.56.
    expect(fha?.loanAmount).toBe(361_875);
    expect(fha?.monthlyPmi).toBe(301.56);
    expect(twenty?.monthlyPmi).toBe(0);

    // More down ⇒ smaller payment, larger cash to close — monotonic both ways.
    expect(fha!.totalMonthly).toBeGreaterThan(ten!.totalMonthly);
    expect(ten!.totalMonthly).toBeGreaterThan(twenty!.totalMonthly);
    expect(fha!.cashToClose).toBeLessThan(ten!.cashToClose);
    expect(ten!.cashToClose).toBeLessThan(twenty!.cashToClose);
  });

  it('each tier is exactly the basic-mortgage result for that down payment', () => {
    const { options } = analyzeProperty(PROPERTY);
    for (const option of options) {
      const { downPct, ...rest } = option;
      expect(rest).toEqual(
        calculateBasicMortgage({
          purchasePrice: PROPERTY.purchasePrice,
          downPayment: { type: 'percent', value: downPct },
          annualRatePct: PROPERTY.annualRatePct,
          termMonths: PROPERTY.termMonths,
          propertyTaxAnnual: PROPERTY.propertyTaxAnnual,
          homeInsuranceAnnual: PROPERTY.homeInsuranceAnnual,
          hoaMonthly: PROPERTY.hoaMonthly,
          pmiAnnualPct: PROPERTY.pmiAnnualPct,
          closingCosts: PROPERTY.closingCosts,
        }),
      );
    }
  });

  it('honors custom down-payment options and rejects invalid ones', () => {
    const { options } = analyzeProperty({ ...PROPERTY, downPaymentOptionsPct: [15, 25] });
    expect(options.map((o) => o.downPct)).toEqual([15, 25]);

    expect(() => analyzeProperty({ ...PROPERTY, downPaymentOptionsPct: [] })).toThrow(RangeError);
    expect(() => analyzeProperty({ ...PROPERTY, downPaymentOptionsPct: [100] })).toThrow(
      RangeError,
    );
    expect(() => analyzeProperty({ ...PROPERTY, downPaymentOptionsPct: [-5] })).toThrow(
      RangeError,
    );
  });
});

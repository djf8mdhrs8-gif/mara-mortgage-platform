import type { Scenario, ScenarioType } from './useScenarios';

export const TYPE_LABELS: Record<ScenarioType, string> = {
  BASIC: 'Mortgage Payment',
  EXTRA_PAYMENT: 'Extra Payments',
  REFINANCE: 'Refinance',
  AFFORDABILITY: 'Affordability',
  RENT_VS_BUY: 'Rent vs. Buy',
  BUYDOWN: 'Rate Buydown',
  PROPERTY_ANALYSIS: 'Property Analysis',
};

function money(value: unknown, cents = true): string {
  if (typeof value !== 'number') return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

function months(value: unknown): string {
  if (typeof value !== 'number') return '—';
  const y = Math.floor(value / 12);
  const m = value % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
}

/**
 * The key figures for a scenario type, in display order — used to build the
 * aligned side-by-side comparison. Values missing from a particular scenario
 * (e.g. permanent-buydown fields on a 2-1 save) render as “—”.
 */
export function summarize(scenario: Scenario): [string, string][] {
  const o = scenario.outputs;
  switch (scenario.type) {
    case 'BASIC':
      return [
        ['Monthly total', money(o.totalMonthly)],
        ['P&I', money(o.monthlyPrincipalInterest)],
        ['PMI', money(o.monthlyPmi)],
        ['Loan amount', money(o.loanAmount, false)],
        ['Cash to close', money(o.cashToClose, false)],
      ];
    case 'EXTRA_PAYMENT':
      return [
        ['Interest saved', money(o.interestSaved)],
        ['Time saved', months(o.monthsSaved)],
        ['Payoff', months(o.payoffMonths)],
        ['Total interest', money(o.totalInterest)],
      ];
    case 'REFINANCE':
      return [
        ['Monthly savings', money(o.monthlySavings)],
        ['Break-even', months(o.breakEvenMonths)],
        ['Lifetime savings', money(o.lifetimeSavings)],
        ['New payment', money(o.newPayment)],
      ];
    case 'AFFORDABILITY':
      return [
        ['Max home price', money(o.maxHomePrice, false)],
        ['Monthly at max', money(o.totalMonthly)],
        ['Loan amount', money(o.loanAmount, false)],
        ['Limited by', typeof o.limitedBy === 'string' ? o.limitedBy : '—'],
      ];
    case 'RENT_VS_BUY':
      return [
        ['Buy − rent at horizon', money(o.wealthDifference, false)],
        ['Break-even year', typeof o.breakEvenYear === 'number' ? `Year ${o.breakEvenYear}` : 'Never'],
        ['Buyer wealth', money(o.finalBuyerNetWealth, false)],
        ['Renter wealth', money(o.finalRenterNetWealth, false)],
      ];
    case 'BUYDOWN':
      return [
        ['Buydown cost', money(o.buydownCost)],
        ['Note payment', money(o.notePayment)],
        ['Monthly savings', money(o.monthlySavings)],
        ['Break-even', months(o.breakEvenMonths)],
        ['Interest saved (points)', money(o.lifetimeInterestSavings)],
      ];
    case 'PROPERTY_ANALYSIS': {
      const options = Array.isArray(o.options) ? (o.options as Record<string, unknown>[]) : [];
      return options.flatMap((tier) => [
        [`${String(tier.downPct)}% down — monthly`, money(tier.totalMonthly)] as [string, string],
        [`${String(tier.downPct)}% down — cash`, money(tier.cashToClose, false)] as [string, string],
      ]);
    }
  }
}

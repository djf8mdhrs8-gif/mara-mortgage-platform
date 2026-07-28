import { calculateBasicMortgage, type BasicMortgageResult } from './basic';

export interface PropertyAnalysisInputs {
  /** Purchase price in dollars (> 0). */
  purchasePrice: number;
  /** Annual interest rate as a percentage (>= 0). */
  annualRatePct: number;
  /** Term in months (positive integer). */
  termMonths: number;
  /** Annual property taxes for this property, in dollars. */
  propertyTaxAnnual?: number;
  /** Annual homeowners insurance for this property, in dollars. */
  homeInsuranceAnnual?: number;
  /** HOA dues per month in dollars. */
  hoaMonthly?: number;
  /** PMI as an annual percentage of the loan, charged while LTV > 80%. */
  pmiAnnualPct?: number;
  /** Estimated closing costs in dollars (cash at closing). */
  closingCosts?: number;
  /**
   * Down-payment percentages to compare. Defaults to [3.5, 10, 20] —
   * FHA minimum, a common conventional entry point, and the no-PMI tier.
   */
  downPaymentOptionsPct?: number[];
}

/** One down-payment tier of the comparison — a full BasicMortgageResult plus its tier. */
export interface PropertyAnalysisOption extends BasicMortgageResult {
  downPct: number;
}

export interface PropertyAnalysisResult {
  options: PropertyAnalysisOption[];
}

/**
 * Property analysis: the same property (price, taxes, insurance, HOA)
 * compared across down-payment tiers, so the payment/cash trade-off — and
 * where PMI falls away — is visible side by side. Each tier is exactly a
 * basic-mortgage calculation; this wrapper only fans out and labels them.
 */
export function analyzeProperty(inputs: PropertyAnalysisInputs): PropertyAnalysisResult {
  const tiers = inputs.downPaymentOptionsPct ?? [3.5, 10, 20];
  if (tiers.length === 0) {
    throw new RangeError('downPaymentOptionsPct must not be empty');
  }
  for (const pct of tiers) {
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      throw new RangeError('each down payment option must be >= 0 and < 100 percent');
    }
  }

  const options = tiers.map((downPct) => ({
    downPct,
    ...calculateBasicMortgage({
      purchasePrice: inputs.purchasePrice,
      downPayment: { type: 'percent', value: downPct },
      annualRatePct: inputs.annualRatePct,
      termMonths: inputs.termMonths,
      propertyTaxAnnual: inputs.propertyTaxAnnual,
      homeInsuranceAnnual: inputs.homeInsuranceAnnual,
      hoaMonthly: inputs.hoaMonthly,
      pmiAnnualPct: inputs.pmiAnnualPct,
      closingCosts: inputs.closingCosts,
    }),
  }));

  return { options };
}

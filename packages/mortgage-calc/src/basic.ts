import { monthlyPayment } from './amortization';
import { fromCents, roundCents, toCents } from './money';

export interface BasicMortgageInputs {
  /** Purchase price in dollars (> 0). */
  purchasePrice: number;
  /** Down payment as a dollar amount or a percentage of purchase price. */
  downPayment: { type: 'amount' | 'percent'; value: number };
  /** Annual interest rate as a percentage (>= 0). */
  annualRatePct: number;
  /** Term in months (positive integer). */
  termMonths: number;
  /** Annual property taxes in dollars. */
  propertyTaxAnnual?: number;
  /** Annual homeowners insurance in dollars. */
  homeInsuranceAnnual?: number;
  /** HOA dues per month in dollars. */
  hoaMonthly?: number;
  /**
   * PMI as an annual percentage of the loan amount (e.g. 0.85).
   * Applied only while LTV > 80% — the standard conventional-loan threshold.
   */
  pmiAnnualPct?: number;
  /** Estimated closing costs in dollars (paid in cash at closing). */
  closingCosts?: number;
}

export interface BasicMortgageResult {
  downPaymentAmount: number;
  loanAmount: number;
  /** Loan-to-value ratio as a percentage, 2dp. */
  ltvPct: number;
  monthlyPrincipalInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  /** 0 when LTV <= 80 or no PMI rate given. */
  monthlyPmi: number;
  totalMonthly: number;
  /** Down payment + closing costs. */
  cashToClose: number;
}

/**
 * The "what will this house cost me monthly" calculator: P&I from the
 * amortization engine plus taxes, insurance, HOA, and PMI (PITI+).
 */
export function calculateBasicMortgage(inputs: BasicMortgageInputs): BasicMortgageResult {
  const {
    purchasePrice,
    downPayment,
    annualRatePct,
    termMonths,
    propertyTaxAnnual = 0,
    homeInsuranceAnnual = 0,
    hoaMonthly = 0,
    pmiAnnualPct = 0,
    closingCosts = 0,
  } = inputs;

  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
    throw new RangeError('purchasePrice must be a positive number');
  }
  if (downPayment.type === 'percent' && (downPayment.value < 0 || downPayment.value > 100)) {
    throw new RangeError('down payment percent must be between 0 and 100');
  }
  if (downPayment.type === 'amount' && (downPayment.value < 0 || downPayment.value > purchasePrice)) {
    throw new RangeError('down payment cannot be negative or exceed the purchase price');
  }
  for (const [name, value] of Object.entries({ propertyTaxAnnual, homeInsuranceAnnual, hoaMonthly, pmiAnnualPct, closingCosts })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be >= 0`);
    }
  }

  const priceCents = toCents(purchasePrice);
  const downCents =
    downPayment.type === 'percent'
      ? roundCents((priceCents * downPayment.value) / 100)
      : toCents(downPayment.value);
  const loanCents = priceCents - downCents;

  if (loanCents <= 0) {
    throw new RangeError('loan amount must be positive — down payment covers the full price');
  }

  const ltvPct = Math.round((loanCents / priceCents) * 10_000) / 100;

  const piCents = toCents(
    monthlyPayment({ principal: fromCents(loanCents), annualRatePct, termMonths }),
  );
  const taxCents = roundCents(toCents(propertyTaxAnnual) / 12);
  const insuranceCents = roundCents(toCents(homeInsuranceAnnual) / 12);
  const hoaCents = toCents(hoaMonthly);
  const pmiCents = ltvPct > 80 ? roundCents((loanCents * pmiAnnualPct) / 100 / 12) : 0;

  return {
    downPaymentAmount: fromCents(downCents),
    loanAmount: fromCents(loanCents),
    ltvPct,
    monthlyPrincipalInterest: fromCents(piCents),
    monthlyPropertyTax: fromCents(taxCents),
    monthlyInsurance: fromCents(insuranceCents),
    monthlyHoa: fromCents(hoaCents),
    monthlyPmi: fromCents(pmiCents),
    totalMonthly: fromCents(piCents + taxCents + insuranceCents + hoaCents + pmiCents),
    cashToClose: fromCents(downCents + toCents(closingCosts)),
  };
}

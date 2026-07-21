import { buildAmortization } from './amortization';
import { fromCents, toCents } from './money';

export interface RefinanceInputs {
  /** Current remaining principal balance in dollars. */
  currentBalance: number;
  /** Current annual rate percentage. */
  currentRatePct: number;
  /** Months left on the current loan. */
  currentRemainingMonths: number;
  /** New loan annual rate percentage. */
  newRatePct: number;
  /** New loan term in months. */
  newTermMonths: number;
  /** Closing costs for the refinance, in dollars. */
  closingCosts?: number;
  /** true → closing costs are rolled into the new loan; false → paid in cash. */
  financeClosingCosts?: boolean;
}

export interface RefinanceResult {
  newLoanAmount: number;
  currentPayment: number;
  newPayment: number;
  /** currentPayment − newPayment; negative when the new payment is higher. */
  monthlySavings: number;
  /**
   * Months of savings needed to recover the closing costs
   * (ceil(closingCosts / monthlySavings)); null when there are no monthly
   * savings to recover them with.
   */
  breakEvenMonths: number | null;
  currentTotalRemainingInterest: number;
  newTotalInterest: number;
  interestSavings: number;
  /** All remaining payments if the current loan is kept. */
  currentTotalRemainingCost: number;
  /** All payments on the new loan, plus cash closing costs when not financed. */
  newTotalCost: number;
  /** currentTotalRemainingCost − newTotalCost; negative means the refi costs more overall. */
  lifetimeSavings: number;
}

/**
 * Rate-and-term refinance comparison.
 *
 * The current loan's forward path is modeled from (balance, rate, remaining
 * months) — for a level-payment loan this reproduces the original payment,
 * since the balance is the annuity value of the remaining payments.
 */
export function calculateRefinance(inputs: RefinanceInputs): RefinanceResult {
  const { closingCosts = 0, financeClosingCosts = false } = inputs;

  if (!Number.isFinite(closingCosts) || closingCosts < 0) {
    throw new RangeError('closingCosts must be >= 0');
  }

  const newLoanAmount = fromCents(
    toCents(inputs.currentBalance) + (financeClosingCosts ? toCents(closingCosts) : 0),
  );

  const current = buildAmortization({
    principal: inputs.currentBalance,
    annualRatePct: inputs.currentRatePct,
    termMonths: inputs.currentRemainingMonths,
  });
  const next = buildAmortization({
    principal: newLoanAmount,
    annualRatePct: inputs.newRatePct,
    termMonths: inputs.newTermMonths,
  });

  const savingsCents = toCents(current.monthlyPayment) - toCents(next.monthlyPayment);
  const closingCents = toCents(closingCosts);
  const breakEvenMonths =
    savingsCents > 0 ? Math.ceil(closingCents / savingsCents) : closingCents === 0 ? 0 : null;

  const currentCostCents = toCents(current.totalPaid);
  const newCostCents = toCents(next.totalPaid) + (financeClosingCosts ? 0 : closingCents);

  return {
    newLoanAmount,
    currentPayment: current.monthlyPayment,
    newPayment: next.monthlyPayment,
    monthlySavings: fromCents(savingsCents),
    breakEvenMonths,
    currentTotalRemainingInterest: current.totalInterest,
    newTotalInterest: next.totalInterest,
    interestSavings: fromCents(toCents(current.totalInterest) - toCents(next.totalInterest)),
    currentTotalRemainingCost: current.totalPaid,
    newTotalCost: fromCents(newCostCents),
    lifetimeSavings: fromCents(currentCostCents - newCostCents),
  };
}

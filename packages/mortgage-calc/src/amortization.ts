import { fromCents, roundCents, toCents } from './money';

export interface AmortizationParams {
  /** Loan amount in dollars (> 0). */
  principal: number;
  /** Annual interest rate as a percentage, e.g. 6.5 for 6.5% (>= 0). */
  annualRatePct: number;
  /** Term in months (positive integer). */
  termMonths: number;
}

export interface AmortizationEntry {
  /** 1-based payment number. */
  paymentNumber: number;
  /** Total paid this month (dollars). */
  payment: number;
  /** Interest portion (dollars). */
  interest: number;
  /** Principal portion (dollars). */
  principal: number;
  /** Remaining balance after this payment (dollars). */
  balance: number;
}

export interface AmortizationResult {
  /** The standard level monthly payment (dollars, rounded to cents). */
  monthlyPayment: number;
  schedule: AmortizationEntry[];
  totalInterest: number;
  totalPaid: number;
  /**
   * Actual number of payments made. Can differ from termMonths by one:
   * cent-rounding of the level payment means the final regular payment can
   * slightly over- or under-shoot the remaining balance.
   */
  payoffMonths: number;
}

function assertParams({ principal, annualRatePct, termMonths }: AmortizationParams): void {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new RangeError('principal must be a positive number');
  }
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) {
    throw new RangeError('annualRatePct must be >= 0');
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError('termMonths must be a positive integer');
  }
}

/**
 * Standard level-payment formula: M = P·r·(1+r)^n / ((1+r)^n − 1),
 * rounded to the cent. Zero-rate loans divide evenly.
 */
export function monthlyPayment(params: AmortizationParams): number {
  assertParams(params);
  const { principal, annualRatePct, termMonths } = params;
  const r = annualRatePct / 100 / 12;
  if (r === 0) {
    return fromCents(roundCents(toCents(principal) / termMonths));
  }
  const factor = (1 + r) ** termMonths;
  return fromCents(roundCents(toCents(principal * ((r * factor) / (factor - 1)))));
}

/**
 * Full amortization schedule with per-row cent rounding — the same
 * convention lenders use, so rows match real statements:
 *   interest_k = round(balance_k · r), principal_k = payment − interest_k,
 * and the final payment settles the exact remaining balance.
 */
export function buildAmortization(params: AmortizationParams): AmortizationResult {
  assertParams(params);
  const { principal, annualRatePct, termMonths } = params;
  const r = annualRatePct / 100 / 12;
  const paymentCents = toCents(monthlyPayment(params));

  const schedule: AmortizationEntry[] = [];
  let balanceCents = toCents(principal);
  let totalInterestCents = 0;
  let totalPaidCents = 0;
  let paymentNumber = 0;

  // Hard ceiling guards against a pathological payment that never amortizes
  // (can only happen if rounding pushed the payment below first-month interest).
  const maxPayments = termMonths + 12;

  while (balanceCents > 0 && paymentNumber < maxPayments) {
    paymentNumber += 1;
    const interestCents = roundCents(balanceCents * r);
    let principalCents = paymentCents - interestCents;
    let paidCents = paymentCents;

    if (principalCents <= 0 && paymentNumber >= maxPayments) {
      throw new RangeError('payment does not amortize the loan');
    }
    if (principalCents >= balanceCents) {
      // Final payment: settle the exact remaining balance.
      principalCents = balanceCents;
      paidCents = principalCents + interestCents;
    }

    balanceCents -= principalCents;
    totalInterestCents += interestCents;
    totalPaidCents += paidCents;

    schedule.push({
      paymentNumber,
      payment: fromCents(paidCents),
      interest: fromCents(interestCents),
      principal: fromCents(principalCents),
      balance: fromCents(balanceCents),
    });
  }

  if (balanceCents > 0) {
    throw new RangeError('payment does not amortize the loan');
  }

  return {
    monthlyPayment: fromCents(paymentCents),
    schedule,
    totalInterest: fromCents(totalInterestCents),
    totalPaid: fromCents(totalPaidCents),
    payoffMonths: paymentNumber,
  };
}

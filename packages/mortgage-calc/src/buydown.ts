import { buildAmortization, monthlyPayment } from './amortization';
import { fromCents, toCents } from './money';

export type TemporaryBuydownType = '1-0' | '2-1' | '3-2-1';

/** Rate reductions per buydown year, in percentage points. */
const BUYDOWN_STEPS: Record<TemporaryBuydownType, number[]> = {
  '1-0': [1],
  '2-1': [2, 1],
  '3-2-1': [3, 2, 1],
};

export interface TemporaryBuydownInputs {
  /** Loan amount in dollars (> 0). */
  loanAmount: number;
  /** Note rate — the permanent annual rate percentage (>= largest reduction). */
  annualRatePct: number;
  /** Term in months (positive integer). */
  termMonths: number;
  type: TemporaryBuydownType;
}

export interface BuydownYearRow {
  /** 1-based buydown year. */
  year: number;
  /** Effective annual rate paid by the borrower this year. */
  ratePct: number;
  /** Monthly P&I at the reduced rate. */
  payment: number;
  /** notePayment − payment. */
  monthlySavings: number;
  /** 12 × monthlySavings. */
  yearlySavings: number;
}

export interface TemporaryBuydownResult {
  /** Monthly P&I at the note rate — the payment after the buydown ends. */
  notePayment: number;
  /** One row per subsidized year, in order. */
  years: BuydownYearRow[];
  /**
   * Total subsidy over the buydown period — what the seller/lender credit
   * must fund (equivalently, the borrower's total payment savings).
   */
  buydownCost: number;
}

export interface PermanentBuydownInputs {
  loanAmount: number;
  /** Note rate before buying points (annual %). */
  annualRatePct: number;
  /** Rate after buying points (annual %, < annualRatePct, >= 0). */
  reducedRatePct: number;
  termMonths: number;
  /** What the points cost, in dollars (> 0). */
  cost: number;
}

export interface PermanentBuydownResult {
  notePayment: number;
  reducedPayment: number;
  monthlySavings: number;
  /** Months of savings to recover the points cost (ceil). */
  breakEvenMonths: number;
  /** Interest over the full term at each rate, and the difference. */
  noteTotalInterest: number;
  reducedTotalInterest: number;
  lifetimeInterestSavings: number;
}

function assertLoan(loanAmount: number, annualRatePct: number, termMonths: number): void {
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    throw new RangeError('loanAmount must be a positive number');
  }
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) {
    throw new RangeError('annualRatePct must be >= 0');
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError('termMonths must be a positive integer');
  }
}

/**
 * Temporary (2-1 or 3-2-1) buydown. The loan itself amortizes at the note
 * rate; a subsidy fund covers the gap between the note payment and what the
 * payment would be at the reduced rate, so each subsidized year's payment is
 * simply the level payment at (note − reduction) — the industry convention.
 */
export function calculateTemporaryBuydown(
  inputs: TemporaryBuydownInputs,
): TemporaryBuydownResult {
  const { loanAmount, annualRatePct, termMonths, type } = inputs;
  assertLoan(loanAmount, annualRatePct, termMonths);

  const steps = BUYDOWN_STEPS[type];
  if (steps === undefined) {
    throw new RangeError(`unknown buydown type: ${String(type)}`);
  }
  const maxStep = Math.max(...steps);
  if (annualRatePct < maxStep) {
    throw new RangeError(`a ${type} buydown needs a note rate of at least ${maxStep}%`);
  }
  if (termMonths < steps.length * 12) {
    throw new RangeError('term must cover the full buydown period');
  }

  const noteCents = toCents(monthlyPayment({ principal: loanAmount, annualRatePct, termMonths }));

  let costCents = 0;
  const years = steps.map((step, index) => {
    const ratePct = annualRatePct - step;
    const payCents = toCents(
      monthlyPayment({ principal: loanAmount, annualRatePct: ratePct, termMonths }),
    );
    const savingsCents = noteCents - payCents;
    costCents += savingsCents * 12;
    return {
      year: index + 1,
      ratePct,
      payment: fromCents(payCents),
      monthlySavings: fromCents(savingsCents),
      yearlySavings: fromCents(savingsCents * 12),
    };
  });

  return {
    notePayment: fromCents(noteCents),
    years,
    buydownCost: fromCents(costCents),
  };
}

/** Permanent buydown (discount points): pay once, keep the lower rate for life. */
export function calculatePermanentBuydown(
  inputs: PermanentBuydownInputs,
): PermanentBuydownResult {
  const { loanAmount, annualRatePct, reducedRatePct, termMonths, cost } = inputs;
  assertLoan(loanAmount, annualRatePct, termMonths);
  if (!Number.isFinite(reducedRatePct) || reducedRatePct < 0 || reducedRatePct >= annualRatePct) {
    throw new RangeError('reducedRatePct must be >= 0 and below the note rate');
  }
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new RangeError('cost must be a positive number');
  }

  const note = buildAmortization({ principal: loanAmount, annualRatePct, termMonths });
  const reduced = buildAmortization({
    principal: loanAmount,
    annualRatePct: reducedRatePct,
    termMonths,
  });

  const savingsCents = toCents(note.monthlyPayment) - toCents(reduced.monthlyPayment);

  return {
    notePayment: note.monthlyPayment,
    reducedPayment: reduced.monthlyPayment,
    monthlySavings: fromCents(savingsCents),
    breakEvenMonths: Math.ceil(toCents(cost) / savingsCents),
    noteTotalInterest: note.totalInterest,
    reducedTotalInterest: reduced.totalInterest,
    lifetimeInterestSavings: fromCents(
      toCents(note.totalInterest) - toCents(reduced.totalInterest),
    ),
  };
}

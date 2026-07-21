import {
  buildAmortization,
  type AmortizationParams,
  type AmortizationResult,
} from './amortization';
import { fromCents, toCents } from './money';

export interface ExtraPaymentInputs extends AmortizationParams {
  /** Additional principal every month, in dollars. */
  extraMonthly?: number;
  /** Annual lump sum in dollars, applied every 12th payment (months 12, 24, ...). */
  extraAnnual?: number;
  /** A single additional payment: amount in dollars at a specific payment number. */
  oneTime?: { amount: number; month: number };
}

export interface ExtraPaymentResult extends AmortizationResult {
  baseline: {
    totalInterest: number;
    totalPaid: number;
    payoffMonths: number;
  };
  monthsSaved: number;
  interestSaved: number;
}

/**
 * Runs the loan twice — without and with extras — and reports the savings.
 * Extra amounts go entirely to principal, on top of the regular payment.
 */
export function buildExtraPaymentPlan(inputs: ExtraPaymentInputs): ExtraPaymentResult {
  const { extraMonthly = 0, extraAnnual = 0, oneTime } = inputs;

  for (const [name, value] of Object.entries({ extraMonthly, extraAnnual })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be >= 0`);
    }
  }
  if (oneTime !== undefined) {
    if (!Number.isFinite(oneTime.amount) || oneTime.amount < 0) {
      throw new RangeError('oneTime.amount must be >= 0');
    }
    if (!Number.isInteger(oneTime.month) || oneTime.month < 1) {
      throw new RangeError('oneTime.month must be a positive payment number');
    }
  }

  const params: AmortizationParams = {
    principal: inputs.principal,
    annualRatePct: inputs.annualRatePct,
    termMonths: inputs.termMonths,
  };

  const extraMonthlyCents = toCents(extraMonthly);
  const extraAnnualCents = toCents(extraAnnual);
  const oneTimeCents = oneTime === undefined ? 0 : toCents(oneTime.amount);

  const baseline = buildAmortization(params);
  const withExtras = buildAmortization(params, (month) => {
    let extra = extraMonthlyCents;
    if (extraAnnualCents > 0 && month % 12 === 0) extra += extraAnnualCents;
    if (oneTime !== undefined && month === oneTime.month) extra += oneTimeCents;
    return extra;
  });

  return {
    ...withExtras,
    baseline: {
      totalInterest: baseline.totalInterest,
      totalPaid: baseline.totalPaid,
      payoffMonths: baseline.payoffMonths,
    },
    monthsSaved: baseline.payoffMonths - withExtras.payoffMonths,
    interestSaved: fromCents(toCents(baseline.totalInterest) - toCents(withExtras.totalInterest)),
  };
}

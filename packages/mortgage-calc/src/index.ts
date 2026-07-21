/**
 * Framework-agnostic mortgage calculation engine. Pure functions, no
 * dependencies — imported by both the API (authoritative recompute, PDFs)
 * and the mobile app (instant on-device feedback). Correctness is enforced
 * by cent-exact tests against independently computed reference schedules.
 */
export { toCents, fromCents, roundCents } from './money';
export {
  monthlyPayment,
  buildAmortization,
  type AmortizationParams,
  type AmortizationEntry,
  type AmortizationResult,
} from './amortization';
export {
  calculateBasicMortgage,
  type BasicMortgageInputs,
  type BasicMortgageResult,
} from './basic';
export {
  buildExtraPaymentPlan,
  type ExtraPaymentInputs,
  type ExtraPaymentResult,
} from './extra-payment';

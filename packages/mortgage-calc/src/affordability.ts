import { fromCents, roundCents } from './money';

export interface AffordabilityInputs {
  /** Gross annual income in dollars. */
  annualIncome: number;
  /** Non-housing monthly debt obligations (cars, cards, student loans). */
  monthlyDebts: number;
  /** Cash available for the down payment, in dollars. */
  downPayment: number;
  /** Mortgage annual rate percentage. */
  annualRatePct: number;
  /** Loan term in months (default 30 years). */
  termMonths?: number;
  /** Property tax as an annual % of home price (default 1.1). */
  propertyTaxAnnualPct?: number;
  /** Homeowners insurance, annual dollars (default 1500). */
  homeInsuranceAnnual?: number;
  /** HOA dues per month (default 0). */
  hoaMonthly?: number;
  /** Front-end (housing) DTI cap percentage (default 28). */
  frontEndPct?: number;
  /** Back-end (total debt) DTI cap percentage (default 36). */
  backEndPct?: number;
}

export interface AffordabilityResult {
  /** Maximum affordable home price, floored to whole dollars. */
  maxHomePrice: number;
  loanAmount: number;
  /** The binding constraint. */
  limitedBy: 'front-end' | 'back-end';
  /** Housing budget allowed by each ratio (monthly dollars). */
  frontEndCap: number;
  backEndCap: number;
  monthlyPrincipalInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  /** Total housing payment at the max price — equals the binding cap (± rounding). */
  totalMonthly: number;
}

/**
 * Classic DTI affordability (28/36 rule by default):
 *   housing budget = min(frontPct·income/12, backPct·income/12 − debts)
 * Inverted to a price given that taxes scale with price:
 *   budget − ins/12 − HOA = f·(price − down) + taxRate/12·price
 *   ⇒ price = (budget − ins/12 − HOA + f·down) / (f + taxRate/12)
 * where f is the level-payment factor per dollar of loan.
 */
export function calculateAffordability(inputs: AffordabilityInputs): AffordabilityResult {
  const {
    annualIncome,
    monthlyDebts,
    downPayment,
    annualRatePct,
    termMonths = 360,
    propertyTaxAnnualPct = 1.1,
    homeInsuranceAnnual = 1500,
    hoaMonthly = 0,
    frontEndPct = 28,
    backEndPct = 36,
  } = inputs;

  if (!Number.isFinite(annualIncome) || annualIncome <= 0) {
    throw new RangeError('annualIncome must be a positive number');
  }
  for (const [name, value] of Object.entries({
    monthlyDebts,
    downPayment,
    annualRatePct,
    propertyTaxAnnualPct,
    homeInsuranceAnnual,
    hoaMonthly,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be >= 0`);
    }
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError('termMonths must be a positive integer');
  }
  if (frontEndPct <= 0 || backEndPct <= 0 || frontEndPct > 100 || backEndPct > 100) {
    throw new RangeError('DTI percentages must be between 0 and 100');
  }

  const monthlyIncome = annualIncome / 12;
  const frontEndCap = (monthlyIncome * frontEndPct) / 100;
  const backEndCap = (monthlyIncome * backEndPct) / 100 - monthlyDebts;
  const housingBudget = Math.min(frontEndCap, backEndCap);
  const limitedBy: AffordabilityResult['limitedBy'] =
    frontEndCap <= backEndCap ? 'front-end' : 'back-end';

  const monthlyInsurance = homeInsuranceAnnual / 12;
  const piAndTaxBudget = housingBudget - monthlyInsurance - hoaMonthly;

  if (piAndTaxBudget <= 0) {
    throw new RangeError('income and debts leave no room for a housing payment');
  }

  // Level-payment factor per dollar of loan.
  const r = annualRatePct / 100 / 12;
  const factor = r === 0 ? 1 / termMonths : (r * (1 + r) ** termMonths) / ((1 + r) ** termMonths - 1);
  const monthlyTaxRate = propertyTaxAnnualPct / 100 / 12;

  const rawPrice = (piAndTaxBudget + factor * downPayment) / (factor + monthlyTaxRate);
  // Floor to whole dollars; never below the down payment itself.
  const maxHomePrice = Math.max(Math.floor(rawPrice), Math.floor(downPayment));
  const loanAmount = Math.max(maxHomePrice - downPayment, 0);

  const piCents = roundCents(factor * loanAmount * 100);
  const taxCents = roundCents(maxHomePrice * monthlyTaxRate * 100);
  const insCents = roundCents(monthlyInsurance * 100);
  const hoaCents = roundCents(hoaMonthly * 100);

  return {
    maxHomePrice,
    loanAmount,
    limitedBy,
    frontEndCap: fromCents(roundCents(frontEndCap * 100)),
    backEndCap: fromCents(roundCents(backEndCap * 100)),
    monthlyPrincipalInterest: fromCents(piCents),
    monthlyPropertyTax: fromCents(taxCents),
    monthlyInsurance: fromCents(insCents),
    monthlyHoa: fromCents(hoaCents),
    totalMonthly: fromCents(piCents + taxCents + insCents + hoaCents),
  };
}

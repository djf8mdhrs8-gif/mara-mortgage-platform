import { buildAmortization } from './amortization';
import { fromCents, roundCents, toCents } from './money';

export interface RentVsBuyInputs {
  /** Purchase price in dollars (> 0). */
  purchasePrice: number;
  /** Down payment as a dollar amount or a percentage of purchase price. */
  downPayment: { type: 'amount' | 'percent'; value: number };
  /** Annual mortgage rate as a percentage (>= 0). */
  annualRatePct: number;
  /** Loan term in months (positive integer). */
  termMonths: number;
  /** Years to project (integer, 1–50). */
  horizonYears: number;
  /** Starting monthly rent in dollars (> 0). */
  monthlyRent: number;
  /** Annual rent growth as a percentage (>= 0). */
  rentGrowthPct?: number;
  /** Annual home appreciation as a percentage (may be negative, > -100). */
  homeAppreciationPct?: number;
  /** Annual return on invested cash as a percentage (>= 0). */
  investmentReturnPct?: number;
  /** Property tax per year as a percentage of current home value. */
  propertyTaxAnnualPct?: number;
  /** Homeowners insurance per year as a percentage of current home value. */
  homeInsuranceAnnualPct?: number;
  /** Maintenance per year as a percentage of current home value. */
  maintenanceAnnualPct?: number;
  /** HOA dues per month in dollars (held flat over the projection). */
  hoaMonthly?: number;
  /**
   * PMI as an annual percentage of the loan amount, charged while the loan
   * balance exceeds 80% of the purchase price (standard cancellation rule).
   */
  pmiAnnualPct?: number;
  /** Buyer's closing costs at purchase as a percentage of price. */
  buyClosingCostsPct?: number;
  /** Selling costs (agent commission etc.) as a percentage of sale value. */
  sellClosingCostsPct?: number;
}

export interface RentVsBuyYear {
  /** 1-based projection year. */
  year: number;
  /** Home value at the end of this year. */
  homeValue: number;
  /** Loan balance at the end of this year. */
  loanBalance: number;
  /** Rent per month during this year. */
  monthlyRent: number;
  /** Buyer cash outflow during this year (P&I, tax, insurance, maintenance, HOA, PMI). */
  buyerCostYear: number;
  /** Renter cash outflow during this year (rent). */
  renterCostYear: number;
  /**
   * Buyer wealth if they sold at the end of this year:
   * home value net of selling costs − loan balance + buyer's invested surplus.
   */
  buyerNetWealth: number;
  /** Renter wealth: invested initial outlay + invested monthly surpluses. */
  renterNetWealth: number;
}

export interface RentVsBuyResult {
  downPaymentAmount: number;
  loanAmount: number;
  monthlyPrincipalInterest: number;
  /** Down payment + buyer closing costs — the cash the renter invests instead. */
  initialBuyerOutlay: number;
  /** First projection year where buying pulls ahead; null if it never does. */
  breakEvenYear: number | null;
  finalBuyerNetWealth: number;
  finalRenterNetWealth: number;
  /** Buyer − renter wealth at the horizon; positive favors buying. */
  wealthDifference: number;
  years: RentVsBuyYear[];
}

interface NamedValue {
  name: string;
  value: number;
  min?: number;
}

function assertFiniteAtLeast(entries: NamedValue[]): void {
  for (const { name, value, min = 0 } of entries) {
    if (!Number.isFinite(value) || value < min) {
      throw new RangeError(`${name} must be a number >= ${min}`);
    }
  }
}

/**
 * Rent-vs-buy wealth projection.
 *
 * Both sides are compared on equal cash: the renter invests the buyer's
 * initial outlay (down payment + closing costs), and each month whichever
 * side pays less invests the difference at the investment return. The buyer's
 * wealth marks the home to market net of selling costs, so each year answers
 * "who is ahead if the buyer sold right now".
 *
 * Simulation is monthly in integer cents with half-up rounding; home value
 * and rent step once per year. Growth compounding necessarily uses float
 * factors ((1+r)^(1/12)) — each month's result is rounded back to cents, so
 * runs are deterministic.
 */
export function calculateRentVsBuy(inputs: RentVsBuyInputs): RentVsBuyResult {
  const {
    purchasePrice,
    downPayment,
    annualRatePct,
    termMonths,
    horizonYears,
    monthlyRent,
    rentGrowthPct = 0,
    homeAppreciationPct = 0,
    investmentReturnPct = 0,
    propertyTaxAnnualPct = 0,
    homeInsuranceAnnualPct = 0,
    maintenanceAnnualPct = 0,
    hoaMonthly = 0,
    pmiAnnualPct = 0,
    buyClosingCostsPct = 0,
    sellClosingCostsPct = 0,
  } = inputs;

  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
    throw new RangeError('purchasePrice must be a positive number');
  }
  if (!Number.isInteger(horizonYears) || horizonYears < 1 || horizonYears > 50) {
    throw new RangeError('horizonYears must be an integer between 1 and 50');
  }
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    throw new RangeError('monthlyRent must be a positive number');
  }
  if (downPayment.type === 'percent' && (downPayment.value < 0 || downPayment.value > 100)) {
    throw new RangeError('down payment percent must be between 0 and 100');
  }
  if (downPayment.type === 'amount' && (downPayment.value < 0 || downPayment.value > purchasePrice)) {
    throw new RangeError('down payment cannot be negative or exceed the purchase price');
  }
  if (!Number.isFinite(homeAppreciationPct) || homeAppreciationPct <= -100) {
    throw new RangeError('homeAppreciationPct must be a number > -100');
  }
  assertFiniteAtLeast([
    { name: 'rentGrowthPct', value: rentGrowthPct },
    { name: 'investmentReturnPct', value: investmentReturnPct },
    { name: 'propertyTaxAnnualPct', value: propertyTaxAnnualPct },
    { name: 'homeInsuranceAnnualPct', value: homeInsuranceAnnualPct },
    { name: 'maintenanceAnnualPct', value: maintenanceAnnualPct },
    { name: 'hoaMonthly', value: hoaMonthly },
    { name: 'pmiAnnualPct', value: pmiAnnualPct },
    { name: 'buyClosingCostsPct', value: buyClosingCostsPct },
    { name: 'sellClosingCostsPct', value: sellClosingCostsPct },
  ]);
  if (sellClosingCostsPct >= 100) {
    throw new RangeError('sellClosingCostsPct must be < 100');
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

  const amortization = buildAmortization({
    principal: fromCents(loanCents),
    annualRatePct,
    termMonths,
  });
  const initialOutlayCents = downCents + roundCents((priceCents * buyClosingCostsPct) / 100);

  const monthlyReturn = (1 + investmentReturnPct / 100) ** (1 / 12) - 1;
  const pmiThresholdCents = roundCents(priceCents * 0.8);
  const hoaCents = toCents(hoaMonthly);

  // The renter starts with the buyer's initial outlay working in the market.
  let renterInvestedCents = initialOutlayCents;
  let buyerInvestedCents = 0;
  let homeValueCents = priceCents;
  let rentCents = toCents(monthlyRent);

  const years: RentVsBuyYear[] = [];
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= horizonYears; year += 1) {
    // Ownership costs for the year are set from the value at the year's start.
    const taxMonthCents = roundCents((homeValueCents * propertyTaxAnnualPct) / 100 / 12);
    const insMonthCents = roundCents((homeValueCents * homeInsuranceAnnualPct) / 100 / 12);
    const maintMonthCents = roundCents((homeValueCents * maintenanceAnnualPct) / 100 / 12);

    let buyerCostYearCents = 0;
    let renterCostYearCents = 0;

    for (let monthOfYear = 1; monthOfYear <= 12; monthOfYear += 1) {
      const paymentNumber = (year - 1) * 12 + monthOfYear;
      // After payoff the schedule ends; P&I stops but the balance stays 0.
      const row = amortization.schedule[paymentNumber - 1];
      const rowPiCents = row === undefined ? 0 : toCents(row.payment);
      const balanceBeforeCents =
        paymentNumber === 1
          ? loanCents
          : toCents(amortization.schedule[paymentNumber - 2]?.balance ?? 0);
      const pmiMonthCents =
        balanceBeforeCents > pmiThresholdCents
          ? roundCents((loanCents * pmiAnnualPct) / 100 / 12)
          : 0;

      const buyerMonthCents =
        rowPiCents + taxMonthCents + insMonthCents + maintMonthCents + hoaCents + pmiMonthCents;

      buyerCostYearCents += buyerMonthCents;
      renterCostYearCents += rentCents;

      // Grow existing investments one month, then whoever paid less this
      // month invests the difference.
      renterInvestedCents = roundCents(renterInvestedCents * (1 + monthlyReturn));
      buyerInvestedCents = roundCents(buyerInvestedCents * (1 + monthlyReturn));
      if (buyerMonthCents > rentCents) {
        renterInvestedCents += buyerMonthCents - rentCents;
      } else {
        buyerInvestedCents += rentCents - buyerMonthCents;
      }
    }

    homeValueCents = roundCents(homeValueCents * (1 + homeAppreciationPct / 100));
    const yearEndBalanceCents = toCents(
      amortization.schedule[Math.min(year * 12, amortization.schedule.length) - 1]?.balance ?? 0,
    );

    const saleProceedsCents =
      roundCents(homeValueCents * (1 - sellClosingCostsPct / 100)) - yearEndBalanceCents;
    const buyerNetWealthCents = saleProceedsCents + buyerInvestedCents;
    const renterNetWealthCents = renterInvestedCents;

    if (breakEvenYear === null && buyerNetWealthCents >= renterNetWealthCents) {
      breakEvenYear = year;
    }

    years.push({
      year,
      homeValue: fromCents(homeValueCents),
      loanBalance: fromCents(yearEndBalanceCents),
      monthlyRent: fromCents(rentCents),
      buyerCostYear: fromCents(buyerCostYearCents),
      renterCostYear: fromCents(renterCostYearCents),
      buyerNetWealth: fromCents(buyerNetWealthCents),
      renterNetWealth: fromCents(renterNetWealthCents),
    });

    rentCents = roundCents(rentCents * (1 + rentGrowthPct / 100));
  }

  const last = years[years.length - 1]!;

  return {
    downPaymentAmount: fromCents(downCents),
    loanAmount: fromCents(loanCents),
    monthlyPrincipalInterest: amortization.monthlyPayment,
    initialBuyerOutlay: fromCents(initialOutlayCents),
    breakEvenYear,
    finalBuyerNetWealth: last.buyerNetWealth,
    finalRenterNetWealth: last.renterNetWealth,
    wealthDifference: fromCents(toCents(last.buyerNetWealth) - toCents(last.renterNetWealth)),
    years,
  };
}

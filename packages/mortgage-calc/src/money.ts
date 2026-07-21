/**
 * Money helpers. All schedule arithmetic runs on integer cents so that
 * per-row rounding is explicit and totals never drift from float error.
 */

/** Dollars → integer cents, half-up (matches financial convention). */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Integer cents → dollars with exactly 2 decimals of precision. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Rounds a fractional cents value half-up to an integer number of cents. */
export function roundCents(cents: number): number {
  return Math.round(cents);
}

import { describe, expect, it } from 'vitest';

import { AmortizationPdfService } from './amortization-pdf.service';

describe('AmortizationPdfService', () => {
  it('renders a valid PDF containing the reference figures', async () => {
    const pdf = await new AmortizationPdfService().render({
      principal: 200_000,
      annualRatePct: 6.5,
      termMonths: 360,
      label: 'Test Scenario',
    });

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // compress:false keeps text operators readable. pdfkit writes text as
    // kern-split HEX string fragments (<4d617261...>), so decode and
    // reassemble them all before asserting.
    const fragments = pdf.toString('latin1').match(/<([0-9a-fA-F]{2,})>/g) ?? [];
    const text = fragments
      .map((f) => Buffer.from(f.slice(1, -1), 'hex').toString('latin1'))
      .join('')
      .replace(/\s+/g, '');
    expect(text).toContain('AmortizationSchedule');
    expect(text).toContain('TestScenario');
    expect(text).toContain('$1,264.14'); // reference monthly payment
    expect(text).toContain('$255,085.82'); // reference total interest
    expect(pdf.length).toBeGreaterThan(10_000);
  }, 15_000);

  it('rejects non-amortizing input', async () => {
    await expect(
      new AmortizationPdfService().render({ principal: -5, annualRatePct: 6, termMonths: 360 }),
    ).rejects.toThrow(RangeError);
  });
});

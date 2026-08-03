import { describe, expect, it } from 'vitest';

import { ScenarioPdfService } from './scenario-pdf.service';
import type { ScenarioDto } from './scenarios.dto';

/** pdfkit writes text as kern-split HEX fragments — decode and reassemble. */
function extractText(pdf: Buffer): string {
  const fragments = pdf.toString('latin1').match(/<([0-9a-fA-F]{2,})>/g) ?? [];
  return fragments
    .map((f) => Buffer.from(f.slice(1, -1), 'hex').toString('latin1'))
    .join('')
    .replace(/\s+/g, '');
}

const scenario: ScenarioDto = {
  id: 'scn_1',
  favorite: false,
  type: 'REFINANCE',
  name: 'Maple St refi',
  inputs: {},
  outputs: {},
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('ScenarioPdfService', () => {
  it('renders a valid PDF containing the brand, name, and recomputed figures', async () => {
    const pdf = await new ScenarioPdfService().render(scenario, {
      monthlySavings: 197.26,
      breakEvenMonths: 31,
      lifetimeSavings: 23_025.6,
      newPayment: 1_798.65,
    });

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const text = extractText(pdf);
    expect(text).toContain('MaraMortgageSolutions');
    expect(text).toContain('MapleStrefi');
    expect(text).toContain('$197.26');
    expect(text).toContain('NMLS#1806779');
    expect(text).toContain('NMLS#1925279');
    expect(text).toContain('notaloanoffer');
  });

  it('skips rows a scenario variant does not have (2-1 buydown vs points)', async () => {
    const pdf = await new ScenarioPdfService().render(
      { ...scenario, type: 'BUYDOWN', name: '2-1 offer' },
      { buydownCost: 6_992.52, notePayment: 1_995.91 },
    );

    const text = extractText(pdf);
    expect(text).toContain('$6,992.52');
    expect(text).not.toContain('Lifetimeinterestsaved');
  });
});

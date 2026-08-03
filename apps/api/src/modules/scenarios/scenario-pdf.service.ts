import { Injectable } from '@nestjs/common';
import type { ScenarioType } from '@prisma/client';
import PDFDocument from 'pdfkit';

import type { ScenarioDto } from './scenarios.dto';

const NAVY = '#0F2A4A';
const GOLD = '#C9A227';
const TEXT = '#10202F';
const MUTED = '#5A6B7C';
const BORDER = '#E1E6EC';
const MARGIN = 48;

// Matches apps/mobile/src/config/contact.ts — the business card footer.
const CONTACT_LINE = 'Mara — NMLS #1925279 · Certified Home Loans NMLS #1806779';
const CONTACT_DETAIL = '(954) 612-5535 · missa@certifiedhomeloans.com';

const TYPE_LABELS: Record<ScenarioType, string> = {
  BASIC: 'Mortgage Payment',
  EXTRA_PAYMENT: 'Extra Payments',
  REFINANCE: 'Refinance',
  AFFORDABILITY: 'Affordability',
  RENT_VS_BUY: 'Rent vs. Buy',
  BUYDOWN: 'Rate Buydown',
  PROPERTY_ANALYSIS: 'Property Analysis',
};

function money(value: unknown, cents = true): string {
  if (typeof value !== 'number') return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

function months(value: unknown): string {
  if (typeof value !== 'number') return '—';
  const y = Math.floor(value / 12);
  const m = value % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
}

/**
 * The scenario's key figures in display order — the server-side twin of the
 * mobile app's summarize() (apps/mobile/src/features/scenarios/summarize.ts).
 * Rows a given save doesn't have (e.g. points fields on a 2-1 buydown) are
 * skipped rather than rendered as dashes.
 */
function summaryRows(type: ScenarioType, o: Record<string, unknown>): [string, string][] {
  const rows: [string, string, boolean][] = (() => {
    switch (type) {
      case 'BASIC':
        return [
          ['Monthly total', money(o.totalMonthly), true],
          ['Principal & interest', money(o.monthlyPrincipalInterest), true],
          ['PMI', money(o.monthlyPmi), typeof o.monthlyPmi === 'number' && o.monthlyPmi > 0],
          ['Loan amount', money(o.loanAmount, false), true],
          ['Cash to close', money(o.cashToClose, false), true],
        ];
      case 'EXTRA_PAYMENT':
        return [
          ['Interest saved', money(o.interestSaved), true],
          ['Time saved', months(o.monthsSaved), true],
          ['Payoff', months(o.payoffMonths), true],
          ['Total interest', money(o.totalInterest), true],
        ];
      case 'REFINANCE':
        return [
          ['Monthly savings', money(o.monthlySavings), true],
          ['Break-even', months(o.breakEvenMonths), true],
          ['Lifetime savings', money(o.lifetimeSavings), true],
          ['New payment', money(o.newPayment), true],
        ];
      case 'AFFORDABILITY':
        return [
          ['Max home price', money(o.maxHomePrice, false), true],
          ['Monthly at max', money(o.totalMonthly), true],
          ['Loan amount', money(o.loanAmount, false), true],
          ['Limited by', typeof o.limitedBy === 'string' ? `${o.limitedBy} ratio` : '—', true],
        ];
      case 'RENT_VS_BUY':
        return [
          ['Buying vs. renting at horizon', money(o.wealthDifference, false), true],
          [
            'Break-even year',
            typeof o.breakEvenYear === 'number' ? `Year ${o.breakEvenYear}` : 'Not within horizon',
            true,
          ],
          ['Buyer net wealth', money(o.finalBuyerNetWealth, false), true],
          ['Renter net wealth', money(o.finalRenterNetWealth, false), true],
        ];
      case 'BUYDOWN':
        return [
          ['Buydown cost', money(o.buydownCost), o.buydownCost !== undefined],
          ['Note payment', money(o.notePayment), true],
          ['Monthly savings', money(o.monthlySavings), o.monthlySavings !== undefined],
          ['Break-even', months(o.breakEvenMonths), o.breakEvenMonths !== undefined],
          [
            'Lifetime interest saved',
            money(o.lifetimeInterestSavings),
            o.lifetimeInterestSavings !== undefined,
          ],
        ];
      case 'PROPERTY_ANALYSIS': {
        const options = Array.isArray(o.options) ? (o.options as Record<string, unknown>[]) : [];
        return options.flatMap((tier): [string, string, boolean][] => [
          [`${String(tier.downPct)}% down — monthly`, money(tier.totalMonthly), true],
          [`${String(tier.downPct)}% down — cash to close`, money(tier.cashToClose, false), true],
        ]);
      }
    }
  })();
  return rows.filter(([, , keep]) => keep).map(([label, value]) => [label, value]);
}

@Injectable()
export class ScenarioPdfService {
  /**
   * One-page, client-shareable summary of a saved scenario. `outputs` must
   * be the authoritative recompute (ScenariosService.recomputeOutputs), not
   * the stored copy.
   */
  render(scenario: ScenarioDto, outputs: Record<string, unknown>): Promise<Buffer> {
    // compress:false keeps text greppable so tests can assert real figures.
    const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fillColor(NAVY).fontSize(20).font('Helvetica-Bold').text('Mara Mortgage Solutions');
    doc
      .fillColor(GOLD)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(TYPE_LABELS[scenario.type].toUpperCase(), { characterSpacing: 1 });
    doc.moveDown(0.6);
    doc.fillColor(TEXT).fontSize(15).font('Helvetica-Bold').text(scenario.name);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Prepared ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      );
    doc.moveDown(1);

    const rows = summaryRows(scenario.type, outputs);
    const labelX = MARGIN;
    const valueX = 330;
    const rowHeight = 26;
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.fillColor(MUTED).fontSize(11).font('Helvetica').text(label, labelX, y + 4, {
        width: valueX - labelX - 10,
      });
      doc
        .fillColor(TEXT)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(value, valueX, y + 2, { width: 612 - MARGIN - valueX, align: 'right' });
      doc
        .moveTo(MARGIN, y + rowHeight - 4)
        .lineTo(612 - MARGIN, y + rowHeight - 4)
        .strokeColor(BORDER)
        .stroke();
      doc.y = y + rowHeight;
    }

    doc.moveDown(2);
    doc
      .fillColor(TEXT)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(CONTACT_LINE, MARGIN, undefined);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(CONTACT_DETAIL);
    doc.moveDown(0.8);
    doc
      .fontSize(7)
      .fillColor(MUTED)
      .text(
        'Estimates for planning purposes only — not a loan offer, rate lock, or commitment to lend. ' +
          'Figures are computed from the inputs saved with this scenario. Generated by the Mara Mortgage app.',
        { width: 612 - MARGIN * 2 },
      );

    doc.end();
    return done;
  }
}

// Idempotent content seed: upserts loan programs by slug.
// Run with: pnpm --filter @mara/api prisma:seed
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const P = (...paragraphs) => paragraphs.join('\n\n');

const PROGRAMS = [
  {
    slug: 'conventional',
    title: 'Conventional Loans',
    summary: 'The most common mortgage — competitive rates with as little as 3% down.',
    sortOrder: 10,
    content: P(
      'Conventional loans are mortgages that aren’t backed by a government agency. They’re the most popular choice for borrowers with solid credit and steady income, offering competitive rates and flexible terms from 10 to 30 years.',
      'Down payments start as low as 3% for qualified first-time buyers. With 20% down you avoid private mortgage insurance (PMI) entirely — and if you start below 20%, PMI automatically drops off once you build enough equity.',
      'Best for: buyers with credit scores of 620+, a stable job history, and a debt-to-income ratio under about 45%.',
    ),
  },
  {
    slug: 'fha',
    title: 'FHA Loans',
    summary: 'Flexible credit requirements with as little as 3.5% down.',
    sortOrder: 20,
    content: P(
      'FHA loans are insured by the Federal Housing Administration and designed to make homeownership accessible — especially for first-time buyers or anyone rebuilding credit.',
      'You can qualify with a credit score as low as 580 with 3.5% down (or 500 with 10% down). Debt-to-income requirements are more forgiving than conventional loans, and down payment funds can come from gifts.',
      'The trade-off: FHA loans carry mortgage insurance premiums (MIP) — an upfront premium plus a monthly amount that typically lasts the life of the loan. Many borrowers start with FHA, then refinance into a conventional loan once their credit and equity improve.',
    ),
  },
  {
    slug: 'va',
    title: 'VA Loans',
    summary: '0% down for veterans, active-duty service members, and eligible spouses.',
    sortOrder: 30,
    content: P(
      'VA loans are guaranteed by the Department of Veterans Affairs and are one of the most powerful benefits available to those who served. No down payment is required, there’s no monthly mortgage insurance, and rates are typically below conventional.',
      'Eligibility extends to veterans, active-duty service members, many National Guard and Reserve members, and certain surviving spouses. A one-time funding fee applies (it can be financed into the loan), and it’s waived entirely for borrowers with service-connected disabilities.',
      'If you’ve served, this should almost always be the first program you look at.',
    ),
  },
  {
    slug: 'usda',
    title: 'USDA Loans',
    summary: '0% down for homes in eligible rural and suburban areas.',
    sortOrder: 40,
    content: P(
      'USDA loans are backed by the U.S. Department of Agriculture and offer 100% financing — no down payment — for homes in designated rural and many suburban areas. You might be surprised how many neighborhoods qualify.',
      'Income limits apply (generally up to 115% of the area median), and the home must be your primary residence. Instead of PMI, USDA charges a modest guarantee fee that’s usually cheaper than FHA insurance.',
      'Best for: moderate-income buyers outside major city centers who want to keep cash in their pocket.',
    ),
  },
  {
    slug: 'jumbo',
    title: 'Jumbo Loans',
    summary: 'Financing above conforming loan limits for higher-priced homes.',
    sortOrder: 50,
    content: P(
      'A jumbo loan is any mortgage that exceeds the conforming loan limits set by the FHFA (which vary by county). If you’re buying a higher-priced home, this is the program that makes it possible.',
      'Because jumbo loans aren’t sold to Fannie Mae or Freddie Mac, lenders set their own standards — typically a 700+ credit score, 10–20% down, healthy cash reserves, and full income documentation.',
      'Rates are often surprisingly competitive with conventional loans. We’ll shop multiple jumbo investors to find the strongest fit for your situation.',
    ),
  },
  {
    slug: 'bank-statement',
    title: 'Bank Statement Loans',
    summary: 'Qualify with bank deposits instead of tax returns — built for the self-employed.',
    sortOrder: 60,
    content: P(
      'Self-employed borrowers often show lower taxable income than they actually earn. Bank statement loans solve this: instead of tax returns, lenders review 12–24 months of business or personal bank statements to calculate qualifying income.',
      'Expect a somewhat higher rate and down payment (typically 10–20%) than a conventional loan, in exchange for a documentation process that reflects how entrepreneurs actually run their finances.',
      'Best for: business owners, freelancers, contractors, and gig workers with strong cash flow and healthy deposits.',
    ),
  },
  {
    slug: 'dscr',
    title: 'DSCR Investor Loans',
    summary: 'Qualify on the property’s rental income — no personal income docs.',
    sortOrder: 70,
    content: P(
      'DSCR (Debt Service Coverage Ratio) loans qualify you based on whether the property’s rental income covers its monthly payment — not your personal income. No tax returns, no W-2s, no employment verification.',
      'A DSCR of 1.0 means rent equals the payment; most programs like to see 1.0–1.25+, though options exist below that. Typically 15–25% down, and the property can close in an LLC.',
      'Best for: real estate investors scaling a rental portfolio who want speed and simple documentation.',
    ),
  },
  {
    slug: 'investment-property',
    title: 'Investment Property Loans',
    summary: 'Conventional financing for rental and income-producing properties.',
    sortOrder: 80,
    content: P(
      'Buying a rental with conventional financing usually means 15–25% down and a rate slightly above owner-occupied loans — lenders price for the added risk.',
      'The upside: you can often count a portion of the property’s expected rental income toward qualifying, and there’s no limit to how much of your payment the rent can cover. Up to 10 financed properties are allowed under conventional guidelines.',
      'We’ll compare conventional investor loans against DSCR options to find the right balance of rate, documentation, and speed for your strategy.',
    ),
  },
  {
    slug: 'second-home',
    title: 'Second Home Loans',
    summary: 'Vacation and secondary residences with as little as 10% down.',
    sortOrder: 90,
    content: P(
      'A second-home loan finances a property you’ll personally use part of the year — a beach house, mountain cabin, or a place near family — with down payments starting around 10%.',
      'Rates sit between primary-residence and investment-property pricing. The home generally needs to be a reasonable distance from your primary residence and suitable for year-round use, and you must control the calendar (occasional renting is fine; full-time rental makes it an investment property).',
    ),
  },
  {
    slug: 'first-time-homebuyer',
    title: 'First-Time Homebuyer Programs',
    summary: 'Lower down payments, reduced PMI, and special pricing for first-timers.',
    sortOrder: 100,
    content: P(
      'If you haven’t owned a home in the last three years, you likely count as a first-time homebuyer — and that unlocks real advantages: conventional loans at 3% down, income-based pricing breaks, and reduced mortgage insurance through programs like HomeReady and Home Possible.',
      'These can be combined with down payment assistance and seller-paid closing costs to dramatically shrink the cash you need at the table.',
      'The best first step is a quick pre-approval conversation — we’ll map every program you qualify for and show you the true monthly cost side by side.',
    ),
  },
  {
    slug: 'down-payment-assistance',
    title: 'Down Payment Assistance',
    summary: 'Grants and second loans that help cover your down payment and closing costs.',
    sortOrder: 110,
    content: P(
      'Down payment assistance (DPA) programs — offered by states, counties, and cities — provide grants, forgivable loans, or low-interest second loans to cover some or all of your down payment and closing costs.',
      'Programs vary widely: some are first-time-buyer only, most have income limits, and many are forgiven entirely after you live in the home a set number of years.',
      'Availability changes throughout the year as funds are allocated, so ask us what’s currently open in your area — pairing the right DPA with the right first mortgage can cut your move-in cash to nearly zero.',
    ),
  },
];

// Compliance copy: created if absent, NEVER overwritten on re-seed —
// admins own this text once it exists. Placeholders are clearly marked
// pending review by the license holder.
const CONTENT_BLOCKS = [
  {
    key: 'compliance.footer',
    body: 'Certified Home Loans · NMLS #1806779 · Equal Housing Lender',
  },
  {
    key: 'compliance.disclosures',
    body: P(
      'Certified Home Loans · Company NMLS #1806779. Verify our licensing at nmlsconsumeraccess.org.',
      'Equal Housing Lender. We do business in accordance with the Federal Fair Housing Act and the Equal Credit Opportunity Act.',
      '[PLACEHOLDER — pending compliance review: list of states where licensed, individual originator NMLS numbers, and any state-specific disclosure text.]',
      'All calculations in this app are estimates for planning purposes only and are not a loan offer, rate quote, or commitment to lend. Rates, programs, and guidelines change without notice. Contact us for a personalized quote.',
    ),
  },
];

const main = async () => {
  for (const block of CONTENT_BLOCKS) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      create: block,
      update: {},
    });
  }
  for (const program of PROGRAMS) {
    await prisma.loanProgram.upsert({
      where: { slug: program.slug },
      create: { ...program, published: true },
      // Content refreshes on re-seed, but never un-publishes admin edits.
      update: { title: program.title, summary: program.summary, content: program.content, sortOrder: program.sortOrder },
    });
  }
  const count = await prisma.loanProgram.count();
  console.log(`seeded ${PROGRAMS.length} programs (table now has ${count})`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

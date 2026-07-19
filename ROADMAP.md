# Roadmap — Mara Mortgage

> Status: **DRAFT — pending approval**. Ordering reflects dependency + risk, not calendar dates (solo-builder pace is hard to estimate accurately up front — we'll calibrate after the first few milestones).

This roadmap groups the 30-50 granular milestones in `TASKS.md` into phases. See `TASKS.md` for the actual execution order and checkboxes.

---

## Phase 0 — Foundation (no user-visible features yet)

Everything needed before feature work can start safely: monorepo scaffold, CI, database schema, auth skeleton, design system tokens, empty-but-deployed apps. Boring on purpose — skipping this phase is what causes rewrites later.

**Exit criteria**: `apps/mobile` runs on a simulator and can hit a deployed `apps/api` health-check endpoint; CI is green on an empty PR; local Docker dev environment works end-to-end.

## Phase 1 — MVP

The smallest version of the product that's actually useful to a real borrower and a real Realtor. This is the version that goes to app store review first.

Includes:
- Authentication (email/password + biometric unlock)
- User roles: borrower, Realtor, admin
- Core calculators: basic mortgage payment, extra-payment, refinance, affordability — with full amortization schedule and PDF export
- Arive integration, Phase 1 mode: secure WebView/deep-link handoff into the existing borrower portal (see `ARCHITECTURE.md` §3 for the adapter design that lets this upgrade later without rework)
- Document upload (borrower-initiated, stored securely, visible to loan officer)
- Loan program education content (Conventional/FHA/VA/USDA/Jumbo, etc.) — static/admin-editable content, not yet personalized
- Contact section: call/text/email/schedule, request pre-approval
- Push notifications: document reminders, application milestones (foundational plumbing; notification *types* expand in Phase 1.5)
- Minimal admin dashboard: publish/edit loan program content and articles, send a push notification to all users
- Required compliance content surfaced in-app (NMLS #, Equal Housing Lender notice, state disclosures — content from you/legal, slots built by engineering)

**Exit criteria**: a real borrower can complete calculator → pre-approval request → application handoff → document upload, and a real Realtor can generate and share a PDF payment scenario, all in a build submitted to TestFlight/Play internal testing.

## Phase 1.5 — Rounding out the MVP

Everything in the original spec not strictly required for Phase 1's "does it work end to end" bar, but still part of the explicitly requested feature set:

- Remaining calculators: rent-vs-buy, buydown (permanent, 2-1, 3-2-1), property analysis
- Mortgage scenarios: save + side-by-side comparison
- Realtor tools: favorite scenarios, direct client send
- Saved favorites: properties, calculations
- Application progress tracking UI polish (status timeline, not just raw state)
- Secure borrower ↔ loan officer messaging (beyond the Phase 1 contact-buttons)
- Notification types: rate updates, educational tips, closing reminders
- Admin dashboard: analytics view, calculator management (enable/disable, edit defaults)
- App Store / Play Store public launch (after Phase 1 gets through internal testing + review cycles)

**Exit criteria**: the app matches the full feature list in the original spec (excluding explicit Phase 2 ideas) and is live in both app stores.

## Phase 2 — Growth features (post-launch, re-prioritized using real usage data)

Directly from the spec's "Phase 2 Ideas," not sequenced further until Phase 1.5 ships and we can see what users/Realtors actually ask for:

- Credit score simulator
- AI mortgage assistant
- Interest rate tracker / live mortgage rates
- MLS/IDX property search
- Realtor referral portal
- Document scanner (camera-based upload with auto-crop/enhance)
- Home equity calculator, cash-out refinance calculator, debt consolidation calculator, investment property cash-flow calculator
- Loan comparison tool, home appreciation calculator, county closing cost estimator
- Personalized loan recommendations

We'll revisit and re-prioritize this list together once Phase 1.5 is live — real usage will tell us which of these actually matter versus which sounded good on paper.

---

## Sequencing principle

Within each phase, `TASKS.md` orders milestones so that:
1. Nothing depends on something not yet built.
2. Foundational/high-risk pieces (calculator math correctness, auth security, Arive integration mode) land early, when they're cheapest to get right.
3. Each milestone is independently demoable — you should never be asked to "trust me" for more than one milestone at a time.

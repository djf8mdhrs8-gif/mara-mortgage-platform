# Project Plan — Mara Mortgage

> Status: **DRAFT — pending approval**. No application code has been written. See `ARCHITECTURE.md`, `TECH_STACK.md`, `ROADMAP.md`, `TASKS.md` for the rest of the planning set.

## 1. What we're building

An iOS + Android mobile app for a mortgage business that lets:

- **Borrowers** apply for a mortgage (via Arive integration), track application progress, upload documents, use advanced mortgage calculators, learn about loan programs, and contact the loan officer.
- **Realtors** use quick payment calculators, generate and share PDF summaries with clients, and save favorite scenarios.
- **Admins** (you / your team) send push notifications, manage loan program content and educational articles, and view analytics.

Design bar: comparable to top-tier banking/fintech apps — modern, clean, minimal, fast, trustworthy.

## 2. Goals

1. Give borrowers a self-serve path from "curious about a payment" → calculator → pre-approval request → application → closing, without leaving the app.
2. Give Realtors a tool they'll actually use with clients in the room (fast calculators, one-tap PDF share) — this is a lead-gen channel for you, not just a borrower feature.
3. Make the mortgage process feel transparent — progress tracking, plain-language education, proactive notifications — instead of the black box borrowers usually experience.
4. Ship a real, working product in small verifiable increments rather than a big-bang release.

## 3. Non-goals (for now — see Phase 2 in `ROADMAP.md`)

- Full AI mortgage assistant, MLS/IDX property search, credit score simulation, live rate tracking — explicitly deferred to Phase 2 per the original spec's "Phase 2 Ideas" list. Building these now would delay the core application + calculator experience that the business actually needs first.
- Building our own e-signature or document-management system — we integrate with Arive's (or a WebView fallback) rather than reinventing loan-document infrastructure.
- Multi-tenant support (other loan officers' businesses using this as white-label software) — this is being built for one mortgage business, not as a SaaS product, unless you tell me otherwise.

## 4. Success criteria

- Borrower can go from app download → submitted mortgage application, entirely within the app (or via a seamless handoff to Arive's portal).
- All calculators listed in the spec produce results that match Karl's Mortgage Calculator (or equivalent) to the cent, verified by unit tests against known-correct amortization math — this is non-negotiable given it's financial output.
- Realtor can generate and share a PDF payment scenario in under 60 seconds.
- Push notifications reliably reach both iOS and Android for milestone/document events.
- App passes Apple App Store and Google Play review on financial-app-specific requirements (data disclosure, biometric usage, licensing text).

## 5. Stakeholders

- **You** — product owner, loan officer, primary decision-maker, compliance/legal point of contact.
- **Claude Code** — architecture, implementation, testing, deployment support, acting as the engineering team.
- **Arive** — third-party LOS vendor; API/integration availability is an external dependency, not fully in our control (see risks below).
- **Borrowers / Realtors** — end users.

## 6. Phased approach

Full detail in `ROADMAP.md`; summary:

- **Phase 1 (MVP)**: Auth + biometric login, core calculators (basic, extra-payment, refinance, affordability), amortization schedule + PDF export, Arive integration (WebView fallback if API unavailable), document upload, loan program education content, contact section, basic push notifications, minimal admin dashboard.
- **Phase 1.5**: Remaining calculators (rent-vs-buy, buydown), Realtor tools (share/PDF), saved scenarios/favorites, richer notifications, analytics in admin dashboard.
- **Phase 2**: Everything in the spec's "Phase 2 Ideas" list — AI assistant, live rates, MLS/IDX, credit score simulator, secure messaging upgrades, referral portal, etc. — prioritized after Phase 1 ships and we have real usage data.

## 7. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| **Arive API access unconfirmed** | High — affects the core "apply for a mortgage" flow | Adapter-pattern integration layer (see `ARCHITECTURE.md` §3) lets us ship a WebView-based flow now and swap in a real API without rework. **You should contact Arive this week** to find out what's actually available. |
| **Regulatory/compliance content** (NMLS #, Equal Housing Lender notices, state disclosures) | High — app store rejection or legal exposure if missing | Flagged early (Phase 1, not an afterthought); needs your/legal's input, not something engineering can originate. |
| **App store review time/rejection risk for financial apps** | Medium — can delay launch by weeks | Budget review-cycle time into the roadmap; front-load biometric/data-handling disclosures required by Apple/Google. |
| **Calculator correctness** | High — wrong mortgage math is a trust-destroying bug in a financial app | Isolated `packages/mortgage-calc` with exhaustive unit tests against known-correct reference values, before it's wired into any UI. |
| **Scope creep from the large Phase 2 wishlist** | Medium — could stall Phase 1 indefinitely | Explicit non-goals above; Phase 2 items are not touched until Phase 1 ships and is stable. |
| **Solo-builder bandwidth** | Medium | Milestones sized small and independently shippable (see `TASKS.md`) so partial progress is always usable, not "80% done and nothing works." |

## 8. How we'll work together

- One milestone at a time (see `TASKS.md`), in order, smallest/foundational first.
- Each milestone ends in something you can see or test — not abstract "infrastructure work" with no visible output, wherever that's avoidable.
- I'll ask for your approval before moving to the next milestone, and before any action with real-world consequences (pushing to the shared GitHub repo, deploying, submitting to app stores, spending money on paid services).
- Documentation (`docs/`, ADRs for non-obvious decisions) grows alongside the code, not as a separate effort at the end.

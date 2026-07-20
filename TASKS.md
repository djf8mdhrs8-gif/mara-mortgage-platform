# Milestones — Mara Mortgage

> Status: **DRAFT — pending approval**. Ordered easiest/most-foundational → hardest, within each phase. We complete one at a time; each ends in something demoable. Nothing here starts until you approve the planning docs.

Legend: `[ ]` not started · each item lists its **Done when** criteria so "finished" isn't a judgment call.

---

## Phase 0 — Foundation

- [x] **1. Monorepo scaffold** — pnpm workspaces + Turborepo, empty `apps/mobile`, `apps/api`, `apps/admin`, `packages/*` with shared tsconfig/eslint. **Done when**: `pnpm install && pnpm build` succeeds from repo root. ✅ 2026-07-19
- [x] **2. CI pipeline** — GitHub Actions: lint, typecheck, test on every PR. **Done when**: a throwaway PR shows green checks. ✅ 2026-07-19 — verified green on push to main (run 29701380782); PR trigger is configured and runs the identical job.
- [x] **3. Local Docker dev environment** — `docker-compose.yml` for Postgres + Redis, `.env.example`. **Done when**: `docker-compose up` gives a working local Postgres reachable from the API. ✅ 2026-07-19 — verified end-to-end: both containers healthy, Postgres `select 1` OK, Redis `PONG`.
- [x] **4. NestJS API skeleton** — bootstrapped app, health-check endpoint, Swagger/OpenAPI wired up, Pino logging. **Done when**: `GET /api/v1/health` returns 200 with structured logs. ✅ 2026-07-19 — health returns 200 JSON, Swagger UI at /api/docs, pino JSON request logs verified.
- [x] **5. Prisma schema v1** — core entities (User, Application, Document, SavedScenario, LoanProgram, Article, Notification) per `ARCHITECTURE.md` §4, initial migration. **Done when**: `prisma migrate dev` runs clean and Prisma Studio shows the tables. ✅ 2026-07-19 — migration applied, all 7 tables verified in Postgres via psql, and /api/v1/health now checks live DB connectivity (`db: "up"`). Pinned Prisma 6.x; v7 upgrade deferred as a dedicated task.
- [ ] **6. Expo app skeleton** — Expo Router navigation shell (auth stack + tab nav placeholders), design tokens (colors/typography from your branding), runs on iOS + Android simulators. **Done when**: app launches to a placeholder home tab on both platforms.
- [ ] **7. Typed API client generation** — OpenAPI spec → generated client, shared via `packages/shared-types`, wired into a React Query provider in the mobile app. **Done when**: the mobile app's home screen displays live data from the `/health` endpoint.
- [ ] **8. Admin app skeleton** — Next.js app, basic layout, hits the same API. **Done when**: admin app loads and can call `/health`.

## Phase 1 — MVP

### Auth & identity
- [ ] **9. User registration + login (email/password)** — Argon2id hashing, JWT access + refresh token issuance, refresh rotation. **Done when**: a user can register, log out, and log back in from the mobile app.
- [ ] **10. Secure token storage + session persistence** — refresh token in `expo-secure-store`, silent token refresh on app resume. **Done when**: closing and reopening the app keeps the user logged in without a visible flicker to the login screen.
- [ ] **11. Biometric unlock** — Face ID/Touch ID/Fingerprint gate on app resume via `expo-local-authentication`. **Done when**: biometric prompt appears on resume and correctly gates access to the stored session.
- [ ] **12. Role-based access control** — borrower/realtor/loan_officer/admin roles, NestJS guards, row-level ownership checks on borrower data. **Done when**: a borrower account cannot fetch another borrower's application via direct API call (tested, not assumed).

### Calculation engine (business-critical — built and tested in isolation before any UI)
- [ ] **13. `packages/mortgage-calc`: amortization core** — principal & interest, full amortization schedule generation. **Done when**: unit tests match a known-correct reference amortization table to the cent.
- [ ] **14. Basic mortgage calculator (UI)** — purchase price, down payment ($/%), rate, term, taxes, insurance, HOA, PMI, closing costs → monthly payment, cash to close, loan amount. **Done when**: results match Karl's Mortgage Calculator for 3 test scenarios you supply.
- [ ] **15. Amortization schedule UI + PDF export** — interactive schedule table, PDF generation (server-side), share sheet. **Done when**: a generated PDF opens correctly on both iOS and Android and matches on-screen numbers.
- [ ] **16. Extra-payment calculator** — extra monthly/annual/one-time payments → years saved, interest saved, new payoff date, updated schedule. **Done when**: verified against a manual spreadsheet calculation for 2 scenarios.
- [ ] **17. Refinance calculator** — current vs. new mortgage comparison, monthly savings, break-even point, total cost comparison. **Done when**: break-even math verified against a manual calculation.
- [ ] **18. Affordability calculator** — income, debts, down payment, taxes, HOA, rate → max home price, estimated payment (standard DTI-based approach). **Done when**: output matches a documented DTI-ratio reference calculation.

### Arive integration
- [ ] **19. Arive adapter interface + WebView implementation** — `AriveAdapter` interface per `ARCHITECTURE.md` §3; `AriveWebViewAdapter` generates a secure deep-link/SSO URL into the existing borrower portal. **Done when**: a logged-in borrower can tap "Start Application" and land inside Arive's portal without re-entering credentials (or with a documented, minimal handoff if SSO isn't available). **Blocked on**: your confirmation of what Arive actually exposes (see `PROJECT_PLAN.md` risk register) — this milestone's exact shape depends on that answer.
- [ ] **20. Application status tracking (basic)** — application record created on start, status field, borrower-visible progress screen. **Done when**: an application's status updates (manually via admin for now) and reflects correctly in the borrower's app.

### Documents
- [ ] **21. Secure document upload** — `expo-document-picker`/`expo-image-picker` → S3/R2 via signed upload URLs, document list per application. **Done when**: a borrower can upload a PDF/photo and see it listed, and the file is confirmed present in storage.
- [ ] **22. Document status + loan-officer visibility** — admin/loan-officer view of uploaded documents, mark as reviewed/needs-resubmission. **Done when**: a status change made in admin is visible to the borrower.

### Content & contact
- [ ] **23. Loan programs content (static + admin-editable)** — Conventional/FHA/VA/USDA/Jumbo/etc. educational screens, content sourced from admin dashboard. **Done when**: editing a loan program in the admin app updates the mobile app's content without a mobile app release.
- [ ] **24. Contact section** — call/text/email deep links, "request pre-approval" form, schedule-appointment link (Calendly-style embed or link-out, decided at implementation time). **Done when**: each action correctly opens the native call/text/email/calendar flow.
- [ ] **25. Compliance content slots** — NMLS #, Equal Housing Lender notice, state disclosures rendered from admin-editable content. **Done when**: content you/legal supply renders correctly on the relevant screens; flagged as **blocked on your compliance content**, not an engineering task.

### Notifications
- [ ] **26. Push notification plumbing** — FCM setup, device token registration, backend send capability. **Done when**: a test notification sent from the API (or a temporary script) reaches a real device on both iOS and Android.
- [ ] **27. Document-reminder + application-milestone notifications** — triggered server-side on relevant events. **Done when**: uploading a document or an admin status change triggers the correct notification on a test device.

### Admin (minimal, Phase 1 scope)
- [ ] **28. Admin auth + basic dashboard shell** — separate stricter-session login for admin app. **Done when**: only `admin` role can log into `apps/admin`.
- [ ] **29. Admin: content management** — CRUD for loan programs and articles. **Done when**: content created/edited in admin appears correctly in the mobile app.
- [ ] **30. Admin: send push notification** — compose + send to all users or a segment. **Done when**: a notification sent from admin reaches a test device.

### Phase 1 hardening & ship
- [ ] **31. Security pass** — rate limiting on auth endpoints, input validation audit, dependency scan clean, audit logging on document access. **Done when**: checklist in `ARCHITECTURE.md` §6 is verified item by item.
- [ ] **32. Error tracking + crash reporting** — Sentry wired into mobile + API. **Done when**: a deliberately triggered test error appears in Sentry within a minute.
- [ ] **33. App icons, splash screens, store assets** — branding applied throughout, EAS build config finalized. **Done when**: a release build installs cleanly from EAS on a physical device.
- [ ] **34. TestFlight + Play internal testing submission** — first real external-facing milestone. **Done when**: you can install the app on your own phone via TestFlight/Play internal testing link. **Requires your explicit go-ahead before submission** (app store submission is a real-world action, not a routine one).

---

## Phase 1.5 — Rounding out the MVP

- [ ] **35. Rent vs. buy calculator** — projected wealth comparison over time, chart visualization.
- [ ] **36. Buydown calculator** — permanent, 2-1, 3-2-1 buydowns; payment schedule + savings.
- [ ] **37. Property analysis tool** — address + financials → instant payment calculation.
- [ ] **38. Save & compare mortgage scenarios** — save calculator runs, side-by-side comparison view.
- [ ] **39. Realtor tools** — quick calculator mode, save favorite scenarios, send scenario directly to a client (email/text with PDF).
- [ ] **40. Saved favorites** — properties and calculations, accessible from user profile.
- [ ] **41. Secure borrower ↔ loan officer messaging** — in-app thread, push-notified.
- [ ] **42. Expanded notification types** — rate updates, educational tips, closing reminders; admin-schedulable.
- [ ] **43. Admin analytics dashboard** — usage metrics (PostHog integration), key funnel views (calculator use → pre-approval request → application start).
- [ ] **44. Admin calculator management** — enable/disable calculators, edit default assumptions (e.g. default PMI rate).
- [ ] **45. Public app store launch** — full review cycle, public listing live. **Requires your explicit go-ahead.**

---

## Phase 2 — Growth features (not sequenced yet)

Tracked in `ROADMAP.md` Phase 2; will be broken into milestones after Phase 1.5 ships and we can prioritize using real usage data rather than guessing now.

---

## Working agreement

- We complete milestones **in order**, one at a time, and I'll show you the result before starting the next.
- Any milestone touching real-world state (app store submission, sending a real push notification broadly, deploying to production, spending money on a paid service) gets an explicit confirmation from you first, even if it's "next" in this list.
- If a milestone turns out to be bigger than it looks once we're in it, I'll say so and propose splitting it rather than quietly ballooning scope.

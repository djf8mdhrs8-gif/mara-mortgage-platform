# Architecture — Mara Mortgage

> Status: **DRAFT — pending approval**. See `TECH_STACK.md` for dependency rationale and `PROJECT_PLAN.md` for scope/goals.

## 1. System overview

```
                        ┌─────────────────────┐
                        │   Arive LOS/Portal   │
                        │ (borrower app + docs)│
                        └──────────▲───────────┘
                                   │ WebView (Phase 1) → REST API (Phase 2, if available)
                                   │
┌──────────────┐   REST (OpenAPI)  │   ┌──────────────────┐
│  apps/mobile │◄──────────────────┼──►│     apps/api      │
│  Expo RN app │                   │   │  NestJS backend   │
│ iOS + Android│                   │   └─────────┬─────────┘
└──────────────┘                       │
       ▲                                │
       │ shared types                   │
┌──────┴───────┐                        │
│ apps/admin    │◄───────────────────────┤
│ Next.js web   │        REST (OpenAPI)  │
└───────────────┘                        │
                                          ▼
                        ┌─────────────────────────────┐
                        │  PostgreSQL (Prisma)         │
                        │  Redis (jobs, rate limiting) │
                        │  S3/R2 (documents)           │
                        │  FCM (push)                  │
                        └─────────────────────────────┘
```

Three client-facing apps, one backend, one source of truth for types and business logic:

- **`apps/mobile`** — the borrower/Realtor-facing product (iOS + Android), Expo/React Native.
- **`apps/admin`** — internal dashboard (content, notifications, analytics), Next.js web app. See `TECH_STACK.md` for why this is a separate web app rather than a mobile screen — flagged for your approval.
- **`apps/api`** — single NestJS backend serving both clients over REST.
- **`packages/mortgage-calc`** — the calculation engine, imported by both the API (source of truth, used for any server-side recompute/PDF generation) and the mobile app (instant on-device calculator feedback with no network round-trip). Same code, two runtimes — this is the reason it's a pure, dependency-free package.

## 2. Folder structure

```
mara-mortgage/
├── apps/
│   ├── mobile/
│   │   ├── app/                      # Expo Router screens (file-based routing)
│   │   │   ├── (auth)/               # login, register, biometric-unlock
│   │   │   ├── (tabs)/               # home, calculators, application, learn, contact
│   │   │   ├── application/          # Arive application flow screens
│   │   │   └── calculators/          # one folder per calculator type
│   │   ├── src/
│   │   │   ├── features/             # feature-based modules (auth, application, calculators, documents, notifications, realtor-tools)
│   │   │   │   └── <feature>/
│   │   │   │       ├── components/
│   │   │   │       ├── hooks/
│   │   │   │       ├── api.ts        # React Query hooks calling the typed API client
│   │   │   │       └── types.ts
│   │   │   ├── components/           # shared/dumb UI components (Button, Card, Input...)
│   │   │   ├── lib/                  # api client instance, secure-storage helpers, biometric helpers
│   │   │   ├── theme/                # design tokens, colors, typography
│   │   │   └── navigation/
│   │   ├── assets/
│   │   └── app.config.ts
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/              # feature-based Nest modules
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── applications/     # Arive integration adapter lives here
│   │   │   │   ├── documents/
│   │   │   │   ├── calculators/      # scenario save/share, PDF export
│   │   │   │   ├── properties/
│   │   │   │   ├── loan-programs/
│   │   │   │   ├── articles/
│   │   │   │   ├── notifications/
│   │   │   │   ├── messaging/
│   │   │   │   └── admin/
│   │   │   ├── common/               # guards, interceptors, decorators, filters
│   │   │   ├── prisma/               # PrismaService, schema
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── test/
│   │
│   └── admin/
│       ├── app/                      # Next.js App Router pages
│       ├── src/
│       │   ├── features/             # content, notifications, analytics, calculator-management
│       │   └── components/
│       └── ...
│
├── packages/
│   ├── mortgage-calc/
│   │   ├── src/
│   │   │   ├── amortization.ts
│   │   │   ├── extra-payment.ts
│   │   │   ├── refinance.ts
│   │   │   ├── affordability.ts
│   │   │   ├── rent-vs-buy.ts
│   │   │   ├── buydown.ts
│   │   │   └── index.ts
│   │   └── __tests__/
│   ├── shared-types/
│   │   └── src/
│   └── config/
│       ├── eslint/
│       └── tsconfig/
│
├── docs/                             # ADRs, API docs, runbooks (grows over time)
├── .github/workflows/
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── PROJECT_PLAN.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── TECH_STACK.md
└── TASKS.md
```

**Feature-based, not layer-based**, inside each app — a `calculators/` folder holds its own components, hooks, and API calls rather than scattering across global `components/`, `hooks/`, `api/` folders. This is what "no duplicated business logic" and "modular code" mean in practice at this scale: when you touch the refinance calculator, everything relevant is in one place.

## 3. API architecture

- **REST + OpenAPI.** NestJS generates an OpenAPI spec via `@nestjs/swagger`; a typed client (e.g. `openapi-typescript` + a thin fetch wrapper) is generated for the mobile and admin apps. This gets most of GraphQL's "typed contract" benefit without a second query language or a gateway layer to operate.
- **Versioned from day one**: `/api/v1/...`. Cheap insurance — mobile app releases lag API deploys (app store review time), so breaking changes need a version boundary from the start, not retrofitted later.
- **Module boundary = feature boundary.** Each Nest module (`applications`, `documents`, `calculators`, ...) owns its own controller, service, and DTOs. Cross-module calls go through injected services, never direct DB access into another module's tables.
- **Arive integration lives behind an adapter interface** (`AriveAdapter`), not scattered through the `applications` module. Phase 1 implementation is `AriveWebViewAdapter` (returns a signed SSO/deep-link URL into Arive's portal); if/when API access is confirmed, `AriveApiAdapter` implements the same interface and swaps in with no controller changes. This is the concrete mechanism for de-risking the biggest unknown in the project (see `PROJECT_PLAN.md` risks).

## 4. Database architecture (high-level entities)

```
User (borrower | realtor | loan_officer | admin)
 ├── AuthCredential (password hash, biometric device keys, refresh tokens)
 ├── Application (1:many)          — links to Arive loan ID once known
 │    └── Document (many)          — uploaded/required docs, status
 ├── SavedScenario (many)          — saved calculator runs, type + inputs + outputs (recomputed server-side on load, never trust cached client output for anything shown as authoritative); `favorite` flag pins to the profile
 │                                   (supersedes the once-planned SavedProperty model — a property IS a PROPERTY_ANALYSIS scenario with its address in the inputs; one table, one source of truth. Decided at M40.)
 ├── Notification (many)           — delivery status per user
 └── MessageThread (many) → Message (many)   — borrower ↔ loan officer

LoanProgram (admin-managed content: Conventional, FHA, VA, USDA, Jumbo, ...)
Article (admin-managed educational content)
AnalyticsEvent (append-only, feeds admin dashboard)
```

Full Prisma schema is written at implementation time (Milestone: "Database schema v1"), not speculated in detail here — but this shape is stable enough to plan against.

## 5. Authentication & authorization strategy

1. **Credentials**: email + password (Argon2id hashing) as the baseline; Arive-portal SSO considered once integration mode is confirmed.
2. **Session**: short-lived JWT access token (~15 min) + long-lived refresh token (rotated on use, revocable server-side), following standard refresh-rotation practice to limit blast radius of a leaked access token.
3. **Storage on device**: refresh token in `expo-secure-store` (Keychain/Keystore-backed), never in `AsyncStorage`.
4. **Biometric login**: `expo-local-authentication` gates *local* access to the already-stored refresh token (Face ID/Touch ID/Fingerprint unlocks the app, it doesn't replace server auth) — standard pattern for financial apps, avoids inventing a biometric-to-server protocol that doesn't exist on most devices.
5. **Authorization**: role-based guards in NestJS (`@Roles('borrower' | 'realtor' | 'loan_officer' | 'admin')`) plus row-level ownership checks (a borrower can only ever fetch their own applications/documents — enforced in the service layer, not just the controller, so a mistake in one guard doesn't expose data).
6. **Admin dashboard** gets its own stricter session policy (shorter expiry, no biometric shortcut, considered for MFA in Phase 2 given it can send push notifications and publish content to all users).

## 6. Security recommendations

- **Encryption in transit**: TLS everywhere (enforced at the load balancer/host level), certificate pinning considered for the mobile app in a later hardening pass.
- **Encryption at rest**: managed Postgres with disk encryption (standard on Neon/RDS/Fly Postgres), S3/R2 server-side encryption for documents.
- **PII/financial data minimization**: don't store full SSNs or full account numbers in our own database if Arive is the system of record for that data — store only what's needed to render UI state (e.g., "SSN on file: yes/no", last 4 digits) and defer the sensitive payload to Arive itself wherever possible. This needs to be revisited once we know whether we're WebView-only or API-integrated.
- **Rate limiting** on auth endpoints (`@nestjs/throttler`) — mortgage apps are a plausible credential-stuffing target given the PII behind login.
- **Input validation** at every boundary: `class-validator` DTOs on the API, Zod schemas on the client, shared where possible via `packages/shared-types`.
- **Audit logging** for document access and application status changes — who viewed/downloaded what, when. Regulated-industry expectation, and useful for your own dispute resolution.
- **Secrets** via environment variables injected by the secret manager (Doppler or host-native) — never committed, never hardcoded, `.env.example` only in git.
- **Dependency scanning**: GitHub Dependabot enabled from repo creation.
- **Compliance note (not legal advice)**: as a licensed mortgage business, you likely have NMLS disclosure requirements (license numbers, Equal Housing Lender notices, state-specific disclosures) that need to appear in-app. This is a content/legal requirement, not a technical one — flagging so it's on the roadmap (`ROADMAP.md` Phase 1) rather than discovered late. Recommend a quick pass with whoever handles your compliance/legal review before Phase 1 ships to app stores.

## 7. Deployment recommendations

| Environment | Mobile | API | Admin | DB |
|---|---|---|---|---|
| **Local dev** | Expo dev client / simulator | `docker-compose up` (API + Postgres + Redis) | `next dev` | Dockerized Postgres |
| **Staging** | Expo internal distribution (EAS) | Fly.io/Render staging app | Vercel preview | Neon branch or staging DB |
| **Production** | App Store + Google Play (EAS Submit) | Fly.io/Render production app | Vercel production | Managed Postgres (primary) |

- **CI (GitHub Actions)**: lint + typecheck + unit tests on every PR (Turborepo caches unaffected packages); `packages/mortgage-calc` gets its own dedicated test job given how business-critical it is.
- **CD**: API/admin auto-deploy on merge to `main` after CI passes; mobile builds are triggered manually via EAS until the app is stable enough to justify automatic OTA pushes.
- **Environments**: `local` → `staging` → `production`, each with its own database and secrets — never point staging mobile builds at the production API.

## 8. Key risks (see `PROJECT_PLAN.md` for full risk register)

1. **Arive API availability is unconfirmed.** Everything above is designed so this doesn't block starting work, but it's the single biggest unknown and should be resolved as early as possible.
2. **Regulatory/compliance content** (NMLS disclosures, state licensing) needs non-engineering input before app store submission.
3. **App store review for financial apps** tends to be slower and stricter (data-handling disclosures, biometric usage justification) — budget extra time in the roadmap for review cycles, including possible rejections.

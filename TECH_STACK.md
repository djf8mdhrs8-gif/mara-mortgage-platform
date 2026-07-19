# Tech Stack — Mara Mortgage

> Status: **DRAFT — pending approval**. Nothing below has been installed or scaffolded yet.

## Assumptions made (flag if wrong)

These were not confirmed with the user before this document was written. They shape sizing and sequencing but are cheap to change now and expensive to change later — correct them before Milestone 1 if they're wrong.

1. **No confirmed Arive API access yet.** The plan below designs an adapter layer so we can start with an embedded/WebView connection to Arive's existing borrower portal and swap in a real API integration later without touching app code. **Action for you:** contact your Arive account rep and ask specifically about (a) a partner/developer API, (b) OAuth-based SSO into the borrower portal, (c) a sandbox/test environment. This is the single biggest unknown in the whole project.
2. **Solo builder** (you + Claude Code), not a multi-engineer team. Milestones are sized as small, independently shippable units rather than parallel-team workstreams.
3. **No existing cloud infrastructure.** Stack recommended from scratch, biased toward low operational overhead over raw scalability (you can migrate to AWS/GCP later if volume demands it — that's a "good problem to have").

---

## Monorepo tooling

| Choice | Why |
|---|---|
| **pnpm workspaces** | Fast, disk-efficient, first-class monorepo support, strict dependency resolution (catches phantom deps that `npm`/`yarn` would silently allow). |
| **Turborepo** | Simpler mental model than Nx for a project this size; remote caching speeds up CI; good Expo + NestJS community support. Nx is more powerful but has a steeper learning curve than this project needs. |

## Mobile app (`apps/mobile`)

| Package | Purpose | Why this one |
|---|---|---|
| **Expo (SDK, latest stable)** | RN framework, build/submit tooling | EAS Build/Submit removes the need to own Xcode/Android Studio CI infra; OTA updates for non-native-code fixes; huge library compatibility. Required by spec. |
| **TypeScript (strict mode)** | Type safety | Required by spec; catches entire classes of bugs before runtime, critical for financial calculations. |
| **React Navigation** | Routing/navigation | De facto standard for RN; native-stack + bottom-tabs cover this app's needs (auth stack, tab nav, calculator stack). |
| **TanStack Query (React Query)** | Server state, caching, retries | Eliminates hand-rolled loading/error/cache logic for API calls (applications, documents, articles); pairs cleanly with a typed API client. |
| **React Hook Form** | Form state | Required by spec; minimal re-renders, good for long multi-step mortgage application forms. |
| **Zod** | Schema validation | Pairs with React Hook Form (`@hookform/resolvers/zod`); same schema can validate calculator inputs and be shared with the backend via `packages/shared-types`. |
| **Zustand** | Lightweight client-only state (e.g. in-progress calculator scenario before save, UI state) | React Query owns server state; we don't need Redux's ceremony for the small slice of local-only state left over. |
| **expo-secure-store** | Encrypted storage for tokens | iOS Keychain / Android Keystore-backed; required for storing refresh tokens safely. |
| **expo-local-authentication** | Face ID / Touch ID / Fingerprint | Required by spec (biometric login). |
| **expo-notifications** + **Firebase Cloud Messaging** | Push notifications | Required by spec; Expo's notification API wraps FCM (Android) and APNs (iOS) behind one interface. |
| **expo-document-picker / expo-image-picker** | Document upload | Needed for secure document upload flow. |
| **react-native-pdf** or server-side PDF generation + share sheet | Amortization schedule / scenario PDF export | Spec requires PDF export; generating on the backend (Milestone-appropriate) keeps calculation logic in one place and avoids a heavy on-device PDF renderer. |
| **Victory Native** or **React Native Skia** (for charts) | Amortization graphs, rent-vs-buy wealth charts | Needed for the "advanced calculator" visualizations; decide at the calculator-charting milestone, not now. |
| **Sentry (RN SDK)** | Crash/error reporting | Financial app — silent crashes during an application flow are unacceptable; catch them in production. |

## Backend (`apps/api`)

| Package | Purpose | Why this one |
|---|---|---|
| **NestJS** | API framework | Required by spec; opinionated modular architecture maps naturally to "feature-based organization," built-in DI, guards, interceptors — good fit for auth-heavy, compliance-sensitive app. |
| **PostgreSQL** | Primary database | Required by spec; relational integrity matters for loan/application/document relationships; mature, well-understood ops story. |
| **Prisma** | ORM / migrations | Required by spec; type-safe queries generated from schema, can share generated types with `packages/shared-types`. |
| **Passport.js (`@nestjs/passport`) + JWT strategy** | Authentication | Industry-standard, first-class NestJS integration, supports refresh-token rotation pattern. |
| **`@nestjs/throttler`** | Rate limiting | Prevents brute-force login/OTP abuse — required for a financial app handling PII. |
| **class-validator / class-transformer** | Request validation | Standard NestJS pattern; pairs with Prisma DTOs. |
| **Docker + docker-compose** | Local dev + deploy packaging | Required by spec; reproducible local Postgres + API, consistent prod image. |
| **AWS S3 (or Cloudflare R2)** | Document storage | Required (secure document upload); S3-compatible APIs are portable — R2 is cheaper with no egress fees if cost matters more than AWS-native tooling. |
| **BullMQ + Redis** | Background jobs (notification fan-out, document virus scan, PDF generation) | Needed once we add async work (e.g., "notify borrower when doc uploaded"); Redis is also useful for rate-limit storage and caching live rate data (Phase 2). |
| **`@nestjs/swagger`** | OpenAPI spec generation | Enables generating a typed API client for the mobile app — removes an entire class of "frontend/backend drift" bugs. |
| **Pino (`nestjs-pino`)** | Structured logging | JSON logs are required for any real observability/alerting setup; plain `console.log` doesn't scale past Milestone 5. |

## Admin dashboard — recommended addition (`apps/admin`)

The spec asks for push notifications, content publishing, analytics, and calculator management to be admin-controlled. That's a web-app job, not a mobile-app job — building admin CRUD screens in React Native would be slower to build and worse to use than a web app, and nothing in the spec requires the admin dashboard to be a mobile app.

**Recommendation:** add `apps/admin` as a **Next.js** app (App Router, TypeScript) inside the same monorepo, sharing `packages/shared-types` and calling the same NestJS API. This is a deviation from the "React Native everywhere" framing in the original spec — flagging it explicitly for your approval rather than silently deciding it. If you'd rather the admin surface live inside the mobile app behind a role gate, say so and I'll fold it into `apps/mobile` instead; it's more constrained but avoids a second app to maintain.

## Shared packages

| Package | Contents |
|---|---|
| `packages/shared-types` | TypeScript types/interfaces shared between mobile, admin, and API (loan application shape, calculator input/output shapes, API request/response DTOs). |
| `packages/mortgage-calc` | **Framework-agnostic, pure-function calculation engine** — amortization, extra-payment, refinance, affordability, rent-vs-buy, buydown math. No React, no NestJS. Unit-tested in isolation. This is the most business-critical package in the repo; correctness here is non-negotiable, and isolating it means we can test it exhaustively without spinning up the app. |
| `packages/config` | Shared `tsconfig.base.json`, ESLint config, Prettier config. |

## Services / infra

| Concern | Recommendation | Why |
|---|---|---|
| **Backend hosting** | **Fly.io** or **Render** for the NestJS API container | Low ops overhead, simple Docker deploy, reasonable pricing at low-to-mid volume. Both support Postgres add-ons or bring-your-own managed DB. Migrate to AWS ECS/Fargate later if volume/compliance requirements demand it. |
| **Managed Postgres** | **Neon** (serverless Postgres, branching for preview envs) or provider-native (Fly Postgres/Render Postgres) | Neon's branch-per-PR workflow is a nice fit for a solo dev iterating fast; otherwise keep it co-located with the app host for simplicity. |
| **File storage** | **Cloudflare R2** | S3-compatible API (works with existing S3 SDKs/Prisma tooling) with zero egress fees — matters for document-heavy workflows. |
| **Push notifications** | **Firebase Cloud Messaging**, via Expo's push service | Required by spec; Expo Push wraps FCM/APNs so the backend only talks to one API. |
| **Auth secrets / env management** | **Doppler** or provider-native secret manager | Never commit secrets; sync across local/CI/prod. |
| **CI/CD** | **GitHub Actions** | Free for a private repo at this scale, native GitHub integration, Turborepo has official caching actions. |
| **Mobile build/release** | **EAS Build + EAS Submit** | Required implicitly by choosing Expo; handles iOS/Android signing and store submission without local Xcode/Android Studio setup. |
| **Error tracking** | **Sentry** (both mobile and API) | Single pane of glass across the stack. |
| **Analytics** | **PostHog** (self-hostable if compliance requires) | Admin dashboard "view analytics" requirement; PostHog's self-host option matters if you later need tighter data control for compliance. |

## Notably NOT chosen (and why)

- **GraphQL** — REST + OpenAPI-generated client gets you most of GraphQL's typed-client benefit with far less operational complexity for a team of one. Revisit only if the admin dashboard's data-fetching patterns get genuinely painful.
- **Redux/Redux Toolkit** — React Query + Zustand covers all identified state needs with less boilerplate.
- **Firebase as the primary backend** (Firestore etc.) — spec explicitly calls for NestJS + PostgreSQL + Prisma; Firebase is scoped to messaging only (FCM), not as a database replacement.
- **Supabase as backend-as-a-service** — tempting for speed, but the spec calls for a real NestJS API (needed anyway for Arive integration logic, PDF generation, and business rules that don't belong in the client).

# Store listing — DRAFT for Mara's review

Working copy for the App Store / Google Play listings (Milestone 33/34). Nothing
here is submitted anywhere yet. **Every section needs Mara's sign-off, and the
compliance-flagged items need whoever handles legal review for Certified Home
Loans** (see `ARCHITECTURE.md` §6 compliance note).

## Identity

| Field | Value |
|---|---|
| App name | Mara Mortgage Solutions |
| iOS subtitle (30 chars max) | Your path to home, simplified |
| Bundle / package id | `com.maramortgage.app` |
| Category | Finance |
| Price | Free |

## Short description (Google Play, 80 chars max)

> Mortgage calculators, loan tracking, and secure document upload with Mara.

## Full description (draft)

> **Mara Mortgage Solutions** puts your home-loan journey in your pocket —
> whether you're exploring what you can afford or already under contract.
>
> **Plan with confidence**
> - Monthly payment, affordability, refinance, and extra-payment calculators
> - Full amortization schedules you can export and share as PDF
> - Clear explanations of FHA, VA, conventional, and other loan programs
>
> **Stay on top of your application**
> - See exactly where your loan stands, from submitted to clear-to-close
> - Upload documents securely from your phone
> - Get notified the moment your loan hits a milestone or needs something
>
> **Learn as you go**
> - Straightforward articles and tips for first-time and repeat buyers
>
> Your data is protected with bank-grade encryption in transit, secure
> sign-in, and optional Face ID / fingerprint lock.
>
> Mara is a licensed loan officer (NMLS #1806779) with Certified Home Loans.
> *[COMPLIANCE REVIEW: exact licensing/entity wording, state coverage list,
> Equal Housing Lender / Opportunity statement placement]*

## Keywords (iOS, 100 chars max)

`mortgage,calculator,home loan,affordability,refinance,amortization,FHA,VA,first time buyer`

## Contact / URLs

| Field | Value |
|---|---|
| Support phone | (954) 612-5535 |
| Support email | missa@certifiedhomeloans.com |
| Marketing URL | **TBD** |
| Privacy policy URL | **TBD — required by BOTH stores before submission** |

## Required visual assets (M34 checklist)

- [x] App icon 1024×1024 (`apps/mobile/assets/branding/icon.png`; EAS derives all sizes)
- [x] Android adaptive icon foreground (`icon-adaptive.png`, safe-zone padded)
- [x] Splash screen (`splash-logo.png`, white background)
- [ ] iOS screenshots — 6.9"/6.7" (1290×2796) required; take from a real device or simulator after the first EAS build
- [ ] Google Play phone screenshots — minimum 2, 16:9 or 9:16
- [ ] Google Play feature graphic — 1024×500 (compose from `mara-logo.png` on brand blue)
- Suggested screenshot flow: calculator with results → amortization chart → application status timeline → document upload → Learn tab

## Data disclosures (both stores ask; answer from what the app actually does)

- **Collected, linked to identity**: name, email, phone (account); financial
  documents the user chooses to upload; application status data.
- **Not collected**: location, contacts, browsing history, advertising IDs.
- **No third-party advertising; no data sold.**
- Biometric (Face ID/fingerprint) is used only to lock/unlock the app locally —
  biometric data never leaves the device (matches `NSFaceIDUsageDescription`).
- Crash/error reporting via Sentry once DSNs are configured (no PII by default —
  `sendDefaultPii: false`).

## App-review prep (financial apps get extra scrutiny — see PROJECT_PLAN risk register)

- Provide a **demo borrower account** in App Review notes (create a dedicated
  reviewer account on the production API at M34 — do not ship the local test creds).
- Be ready to show the NMLS licensing relationship if asked (financial-services
  entitlement questions).
- Biometric justification: app lock only, wording already in `Info.plist`.

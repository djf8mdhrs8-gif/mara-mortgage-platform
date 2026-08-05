# Deploying the app as a website (interim, until the app stores)

The borrower app is built with Expo and runs fully in the browser, so the same
codebase ships as a real website today. This guide deploys all three pieces to
**Render** (one account, ~15 minutes):

| Piece | What it is | URL after deploy |
|---|---|---|
| `mara-api` | The backend (NestJS + Postgres) | `https://mara-api.onrender.com` |
| `mara-app` | The borrower web app (static Expo export) | `https://mara-app.onrender.com` |
| `mara-admin` | Mara's admin site (Next.js) | `https://mara-admin.onrender.com` |

## Read this first: preview vs. real clients

The blueprint deploys entirely on free tiers, which is perfect for looking at
the live site and showing Mara. It is **not** safe to put real borrowers on as-is,
for one specific reason:

> **Render's free PostgreSQL is deleted 30 days after it is created** (plus a
> 14-day grace period to upgrade). Every account, saved scenario, and message
> in it goes with it.

So treat this as two stages:

| | Preview / showing Mara | Real clients using it |
|---|---|---|
| Database | Render free (**expires in 30 days**) | Neon free (permanent) or Render paid |
| Documents | ephemeral `/tmp` | Cloudflare R2 (free tier) |
| API service | free (sleeps ~50s after idle) | Starter (~$7/mo, always awake) |
| Borrower site | free static (always fast) | same |
| Running cost | $0 | ~$7/mo, or $0 if you accept the cold start |

Stage 1 is the steps below. Stage 2 is the **Before you invite real clients**
checklist further down — none of it requires a code change, only settings.

## Step 1 — Deploy

1. Create an account at https://render.com (sign in with the GitHub account
   that owns this repo).
2. Dashboard → **New → Blueprint** → connect `mara-mortgage-platform` →
   Render reads `render.yaml` and shows the three services + database → **Apply**.
3. Wait for the first deploys (the API's Docker build takes a few minutes).

## Step 2 — If the URLs came out different

Service names are global on Render — if `mara-api` etc. were taken, your URLs
have a suffix (e.g. `mara-api-x3f2.onrender.com`). In that case update, in the
Render dashboard, then redeploy the affected services:

- `mara-api` → env var `WEB_ORIGINS` = the real app + admin URLs (comma-separated)
- `mara-app` → env var `EXPO_PUBLIC_API_URL` = the real API URL
- `mara-admin` → env vars `NEXT_PUBLIC_API_URL` and `API_URL` = the real API URL

## Step 3 — Seed the database (content + Mara's admin account)

The fresh database has no loan programs, compliance text, or users. From this
repo on your machine (PowerShell), using the **External Database URL** from the
`mara-db` page on Render:

```bash
cd apps/api
```

```bash
$env:DATABASE_URL='<External Database URL>'; $env:ADMIN_EMAIL='mara@yourdomain.com'; $env:ADMIN_PASSWORD='<a strong password, 12+ chars>'; pnpm prisma:seed
```

That seeds the 11 loan programs, articles, the privacy policy, and compliance
text, and creates Mara's ADMIN account (never overwrites an existing user; skip
the ADMIN_* vars to seed content only). Give Mara the email/password you chose —
she signs into `mara-admin` with it and can change content immediately.

## Step 4 — Check it works

1. Open `https://mara-app.onrender.com` → the branded sign-in screen loads.
2. Register a borrower account → run a calculator → save a scenario.
3. Open `https://mara-admin.onrender.com` → sign in as Mara → Analytics shows
   the new user; Messages/Content/Calculators all live.

Note: free-tier services **sleep after idle** — the first request after a quiet
period takes ~30–60s while the API wakes. Fine while you're evaluating.

---

# Before you invite real clients

Work down this list. Everything here is settings and accounts — no code changes.

- [ ] **Move to a database that doesn't expire** — see below. Do this *first*,
      because switching later means re-seeding and losing whatever accumulated.
- [ ] **Turn on durable document storage** (Cloudflare R2) — see below.
      Until then uploads vanish on every deploy.
- [ ] **Have Mara approve the privacy policy and compliance text.** Both ship
      seeded with a clearly marked `[PLACEHOLDER]` paragraph. She edits them in
      the admin site under Content; the policy is public at `/privacy` and is
      linked from the sign-in screen, so clients will read it.
- [ ] **Consider the Starter plan for `mara-api`** (~$7/mo at the time of
      writing). On free, a client opening the link after a quiet period waits
      ~50 seconds for sign-in — a poor first impression of her brand. The
      borrower site itself is static and always loads instantly either way.
- [ ] **Set up a custom domain** (see the end of this doc) so the link Mara
      shares looks like her business, not `onrender.com`.

## Durable database (do before real clients)

Two good options — both keep the same `DATABASE_URL` wiring, so this is a
settings change:

**Option A — Neon free tier (permanent, $0).** Neon's free plan does not expire
(roughly 0.5 GB storage and 100 compute-hours per month at the time of writing,
which is far more than a soft launch needs).

1. Create a project at https://neon.com → copy the **connection string**.
2. Render → `mara-api` → Environment → replace `DATABASE_URL` with it.
   (In `render.yaml` the value comes `fromDatabase`; overriding it in the
   dashboard takes precedence. You can then delete the `mara-db` instance.)
3. Re-run the seed from Step 3 against the new `DATABASE_URL`.

**Option B — Render paid Postgres.** On the `mara-db` page choose a paid
instance type (~$6–7/mo at the time of writing). Nothing else changes; the data
already there is kept.

Either way, verify before inviting anyone: register a test borrower, redeploy
the API, and confirm the account still signs in.

## Durable document storage (Cloudflare R2 — do before real borrower uploads)

The API's storage driver is chosen by env vars: set `S3_BUCKET` and documents
go to any S3-compatible bucket instead of the local disk. Cloudflare R2 has a
free tier (10 GB) with no egress fees:

1. Cloudflare dashboard → **R2 Object Storage** → Create bucket (e.g.
   `mara-documents`; location Automatic).
2. R2 → **Manage API tokens** → Create API token → permission **Object Read &
   Write**, scoped to that bucket → note the Access Key ID + Secret Access Key.
3. Render → `mara-api` → Environment → add:
   - `S3_BUCKET` = `mara-documents`
   - `S3_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com` (shown on
     the bucket page)
   - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` = the token values
4. Save → the API redeploys. The boot log prints
   `document storage: S3-compatible bucket "mara-documents"` — upload a
   document and it now survives deploys and restarts.

AWS S3 works the same way (omit `S3_ENDPOINT`, set `S3_REGION`). Documents
uploaded before the switch were on the ephemeral disk and are not migrated —
ask borrowers to re-upload anything from before, or do the switch first.

## What the website does and doesn't do vs. the phone app

- **Push notifications** need the installed app (Expo push tokens) — on the
  website, everything still lands in the in-app notification history and
  Messages, there's just no phone banner.
- **Face ID/biometric lock** is a native feature; the website uses the normal
  session security (short-lived tokens, refresh rotation).
- The **rate-limit and CORS** protections are active in production; CORS only
  admits the two site origins via `WEB_ORIGINS`. The API's Swagger docs page is
  served only outside production.

## When the phone apps ship (M45)

Point `eas.json`'s `preview`/`production` `EXPO_PUBLIC_API_URL` at
`https://mara-api.onrender.com` (or the custom domain below) — the same API
serves web and native.

## Custom domain (recommended before sharing widely)

Render → `mara-app` → Settings → Custom Domains (e.g.
`app.maramortgagesolutions.com`; DNS CNAME as instructed). Add the custom
origin to `mara-api`'s `WEB_ORIGINS` afterwards. Same for the admin site if
desired (e.g. `admin.…`).

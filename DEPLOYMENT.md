# Deploying the app as a website (interim, until the app stores)

The borrower app is built with Expo and runs fully in the browser, so the same
codebase ships as a real website today. This guide deploys all three pieces to
**Render** (free tier, one account, ~15 minutes):

| Piece | What it is | URL after deploy |
|---|---|---|
| `mara-api` | The backend (NestJS + Postgres) | `https://mara-api.onrender.com` |
| `mara-app` | The borrower web app (static Expo export) | `https://mara-app.onrender.com` |
| `mara-admin` | Mara's admin site (Next.js) | `https://mara-admin.onrender.com` |

## One-time setup

1. Create a free account at https://render.com (sign in with the GitHub
   account that owns this repo).
2. Dashboard → **New → Blueprint** → connect `mara-mortgage-platform` →
   Render reads `render.yaml` and shows the three services + database → **Apply**.
3. Wait for the first deploys (the API's Docker build takes a few minutes).

## If the URLs came out different

Service names are global on Render — if `mara-api` etc. were taken, your URLs
have a suffix (e.g. `mara-api-x3f2.onrender.com`). In that case update, in the
Render dashboard, then redeploy the affected services:

- `mara-api` → env var `WEB_ORIGINS` = the real app + admin URLs (comma-separated)
- `mara-app` → env var `EXPO_PUBLIC_API_URL` = the real API URL
- `mara-admin` → env vars `NEXT_PUBLIC_API_URL` and `API_URL` = the real API URL

## Seed the database (content + Mara's admin account)

The fresh database has no loan programs, compliance text, or users. From this
repo on your machine (PowerShell), using the **External Database URL** from the
`mara-db` page on Render:

```bash
cd apps/api
```

```bash
$env:DATABASE_URL='<External Database URL>'; $env:ADMIN_EMAIL='mara@yourdomain.com'; $env:ADMIN_PASSWORD='<a strong password, 12+ chars>'; pnpm prisma:seed
```

That seeds the 11 loan programs, articles/compliance text, and creates Mara's
ADMIN account (never overwrites an existing user; skip the ADMIN_* vars to seed
content only). Give Mara the email/password you chose — she signs into
`mara-admin` with it and can change content immediately.

## Check it works

1. Open `https://mara-app.onrender.com` → the branded sign-in screen loads.
2. Register a borrower account → run a calculator → save a scenario.
3. Open `https://mara-admin.onrender.com` → sign in as Mara → Analytics shows
   the new user; Messages/Content/Calculators all live.

Note: free-tier services **sleep after idle** — the first request after a
quiet period takes ~30–60s while the API wakes. Fine for a soft launch;
Render's Starter plan ($7/mo per service) removes it.

## Known interim limitations (before real borrowers)

- **Document uploads are ephemeral until S3/R2 is configured.** The free API
  instance has no persistent disk (`FILE_STORAGE_DIR=/tmp/storage`), so
  uploaded documents vanish on deploy/restart. The fix is config-only — see
  "Durable document storage" below; do it before borrowers upload real
  documents.
- **Push notifications** need the installed app (Expo push tokens) — on the
  website, everything still lands in the in-app notification history and
  Messages, there's just no phone banner.
- **Face ID/biometric lock** is a native feature; the website uses the normal
  session security (short-lived tokens, refresh rotation).
- The **rate-limit and CORS** protections are active in production; CORS only
  admits the two site origins via `WEB_ORIGINS`.

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

## When the phone apps ship (M45)

Point `eas.json`'s `preview`/`production` `EXPO_PUBLIC_API_URL` at
`https://mara-api.onrender.com` (or the custom domain below) — the same API
serves web and native.

## Custom domain (optional, recommended before sharing widely)

Render → `mara-app` → Settings → Custom Domains (e.g.
`app.maramortgagesolutions.com`; DNS CNAME as instructed). Add the custom
origin to `mara-api`'s `WEB_ORIGINS` afterwards. Same for the admin site if
desired (e.g. `admin.…`).

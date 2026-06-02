# Prime Trade Capitals

HTML + Bootstrap 5 site and client portal. **Data and file storage use Supabase** (no PHP).

## Supabase setup (one-time)

In the [Supabase SQL Editor](https://supabase.com/dashboard), run **one file**:

**`supabase/full_setup.sql`** (schema + storage + plans + admin user)

Or run the split files in order: `001_schema.sql` → `002_custom_auth.sql` → `storage_policies.sql` → `seed.sql` → admin block in `full_setup.sql`.

Create a public bucket `kyc-documents` if it is not created by the migration (the SQL files handle this).

### Credentials

Set in `js/config.js` (already configured for this project):

- `SUPABASE_URL` — your project URL  
- `SUPABASE_ANON_KEY` — publishable (anon) key  

`.env.example` lists the same values as `NEXT_PUBLIC_*` for other tooling.

## Run locally

**Option A — Node (site + optional local API fallback)**

```bash
npm install
npm start
```

Open http://localhost:3000

**Option B — static only**

Serve the folder with any static server; portal sync and KYC uploads require Supabase scripts (included on auth/portal pages).

Default admin (first launch): `admin` / `admin`

## What is stored in Supabase

| Data | Where |
|------|--------|
| Users, balances, transactions, KYC metadata | `public.app_users` (synced from the portal) |
| KYC files (PDF/images) | Storage bucket `kyc-documents` → `uploads/<user-id>/...` |
| Contact form | `public.contact_messages` |

Admin at `portal/admin.html` sees all users once they are synced to `app_users`.

## Deploy on Render

1. Push to GitHub and connect a **Web Service** on Render.
2. Build: `npm install` · Start: `npm start` (serves static files; data lives in Supabase, not on the Render disk).
3. You can remove the persistent disk from `render.yaml` if you only use Supabase — or keep it for future use.

Ensure `js/config.js` is deployed with your real Supabase keys.

## Deploy on GitHub Pages

This repository now includes a workflow at `.github/workflows/deploy-pages.yml` that deploys on pushes to `main`.

1. Push this repo to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the Actions tab).

Notes:

- GitHub Pages serves the static site only; `server.js` and `/api` routes do not run there.
- Portal/auth features continue to work because they use Supabase directly from the browser.
- Keep `js/config.js` set with the correct Supabase URL and anon key before deploying.

## Regenerate marketing pages

```bash
python scripts/render_static.py
```

After regenerating `contact.html`, re-add these lines before `contact-form.js` if missing:

```html
<script src="js/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase.js"></script>
```

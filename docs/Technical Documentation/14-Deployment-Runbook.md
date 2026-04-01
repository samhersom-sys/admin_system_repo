# DEPLOYMENT RUNBOOK — CLEANED

**Created:** 2026-03-30  
**Status:** Active — production deployment reference  
**Scope:** Deploy the `Cleaned/` repository only. Do **not** deploy `policy-forge-chat (BackUp)/`.

---

## 1. Repository Boundary

- Production deployments are sourced from the dedicated GitHub repository connected to `Cleaned/` only.
- The local `policy-forge-chat (BackUp)/` folder remains a read-only analysis/reference codebase.
- Nothing outside the `Cleaned/` repository root is pushed or deployed.

---

## 2. First Release Topology

### Production only

- `www.thepolicyforge.com` — marketing website (`website/`) via Cloudflare Pages
- `app.thepolicyforge.com` — SPA (`frontend/`) via Railway
- `api.thepolicyforge.com` — NestJS backend (`backend/nest/`) via Railway
- Railway Postgres — production database

### Deferred until later

- `app.test.policyforge.com`
- `api.test.policyforge.com`
- Any public production/test environment selector

---

## 3. Login Entry Decision

- The website login link points to `https://app.thepolicyforge.com/login`.
- The login page lives in the SPA, not the marketing website.
- No environment dropdown is shown on the website for the first release.

---

## 4. Environment Files

### Root backend environment

- Local dev/test use the existing root files:
  - `.env.local`
  - `.env.test`
- Production placeholders live in:
  - `.env.production`

### Frontend

- First production release requires no committed frontend-only env vars.
- See `frontend/.env.production.example`.
- The SPA derives `api.` from `app.` automatically in deployed environments and uses the local Vite proxy on `localhost`.

### Website

- Production website env example:
  - `website/.env.production.example`
- Required variable:
  - `NEXT_PUBLIC_APP_URL=https://app.thepolicyforge.com`

---

## 5. Railway Services

**Verified production services:**

- `policyforge-postgres` — Railway Postgres
- `policyforge-api` — `backend/nest`
- `policyforge-app` — `frontend`

### Backend service

- Root directory: `backend/nest`
- Build command: `npm run build`
- Start command: `npm run start:prod`
- Required environment variables:
  - `DATABASE_URL`
  - `DATABASE_SSL=true`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - `HOST=0.0.0.0`
  - `CORS_ORIGINS=https://app.thepolicyforge.com`
  - `FRONTEND_URL=https://app.thepolicyforge.com`
- Health check path: `/api/health`
- Custom domain: `api.thepolicyforge.com`

#### Backend setup sequence

1. Create a Railway project for production.
2. Add a Postgres database to the project.
3. Add a service from the GitHub repository.
4. Point the service root to `backend/nest`.
5. Set the build command to `npm run build`.
6. Set the start command to `npm run start:prod`.
7. Attach the Postgres `DATABASE_URL` value from Railway.
8. Add `DATABASE_SSL=true`, `HOST=0.0.0.0`, `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGINS`, and `FRONTEND_URL`.
9. Deploy once on the Railway-generated domain before attaching the custom domain.
10. When attaching `api.thepolicyforge.com`, point the custom domain at Railway's detected service port, which resolved as `8080` in production.

#### Backend operational notes

- `backend/nest/src/config/typeorm.config.ts` keeps `migrationsRun: false` by design.
- Railway deployment does **not** bootstrap the schema automatically.
- Run migrations explicitly before public cutover.
- If running migrations from a local machine, use the Railway **public** Postgres connection string. The internal Railway hostname only resolves inside Railway.
- Verify the custom domain on `https://api.thepolicyforge.com/api/health` before validating login or SPA traffic.

### Frontend service

- Root directory: `frontend`
- Build command: `npx vite build`
- Start command: `npx vite preview --host 0.0.0.0 --port $PORT`
- No first-release frontend env vars are required
- Custom domain: `app.thepolicyforge.com`

#### Frontend setup sequence

1. Add a second Railway service from the same GitHub repository.
2. Point the service root to `frontend`.
3. Set the build command to `npx vite build`.
4. Set the start command to `npx vite preview --host 0.0.0.0 --port $PORT`.
5. Deploy once on the Railway-generated domain before attaching the custom domain.
6. After the backend custom domain is live, confirm the SPA resolves relative `/api/*` calls to `https://api.<domain>` automatically.

#### Frontend operational notes

- Railway's default `npm run build` is not sufficient here because the repository root prebuild flow can trigger unrelated scan/test steps. Use `npx vite build` explicitly.
- `frontend/vite.config.ts` must allow the production preview host so Railway can serve `app.thepolicyforge.com` successfully.
- Validate the deployed SPA on both the Railway-generated domain and `https://app.thepolicyforge.com` before moving on to auth testing.

### Database

- Use Railway Postgres for the first production release
- Keep production isolated from local dev/test databases
- Confirm migration execution before public cutover

#### Database setup notes

- Let Railway inject the production `DATABASE_URL`.
- Keep `PORT` unset in Railway unless a specific manual override is required; Railway injects its own listening port.
- Run migrations against the Railway database before public cutover.
- Do not assume application startup will create tables.
- Do not use Railway's internal Postgres hostname from a local terminal; use the public connection string instead.

#### Production bootstrap sequence

1. Export a public Railway Postgres `DATABASE_URL` in the local shell.
2. From the repository root, run `npm run db:migrate`.
3. If the admin users need to be created from `db/seeds/001-users.js`, run that script manually with `NODE_ENV=development`.
4. Treat seeded credentials as temporary bootstrap access and rotate them immediately after first login if production policy requires it.
5. Never wire user seed scripts into the production deployment pipeline.

---

## 6. Cloudflare

### Website

- Product: Cloudflare Pages
- Cloudflare Pages project root: `website`
- Cloudflare Pages framework preset: `Next.js (Static HTML Export)`
- Cloudflare Pages build command: `npm run build`
- Cloudflare Pages build output directory: `out`
- Production env variable:
  - `NEXT_PUBLIC_APP_URL=https://app.thepolicyforge.com`

#### Website operational notes

- Use Pages, not Workers Builds. If Cloudflare asks for a deploy command such as `wrangler deploy`, the wrong product flow was selected.
- Keep the root directory as `website` and the output directory as `out`. Do not set the output directory to `website/out`.
- When diagnosing stale deployments, confirm the build log shows the latest Git commit SHA before debugging application code.
- Attach `www.thepolicyforge.com` only after the Pages preview deployment succeeds.

### DNS / proxying

- `www` → Cloudflare Pages (proxied)
- `app` → Railway frontend custom domain (proxied)
- `api` → Railway backend custom domain (proxied)

### API note

- Keep API traffic dynamic; do not cache API responses at Cloudflare.

---

## 7. CI/CD Shape

### Branching

- `main` is the production release branch
- Feature work happens on non-`main` branches

### Required CI before deploy

- Frontend tests
- Frontend scan tests
- Backend tests
- Frontend build
- Website build
- Backend build

### Deployment trigger

- Railway and Cloudflare deploy from `main` only after CI passes

---

## 8. Validation Before Public Cutover

- Website loads on `www.thepolicyforge.com`
- Website login link opens `app.thepolicyforge.com/login`
- SPA loads on `app.thepolicyforge.com`
- SPA API calls resolve to `api.thepolicyforge.com`
- Backend health endpoint responds successfully
- Railway Postgres connection succeeds in production
- Production database schema is present after manual migration run
- Admin login succeeds against the live API
- Cloudflare proxying does not break app or API traffic

---

## 9. Answer To The Repository Boundary Question

**Will this only publish the Cleaned folder?**

Yes.

- The Git repository root is the `Cleaned/` folder.
- Only files inside that folder are committed and pushed.
- `policy-forge-chat (BackUp)/` is outside this repository and is not published.
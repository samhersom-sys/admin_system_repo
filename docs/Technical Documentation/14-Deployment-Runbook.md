# DEPLOYMENT RUNBOOK — CLEANED

**Created:** 2026-03-30  
**Status:** Draft — first production release preparation  
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

### Frontend service

- Root directory: `frontend`
- Build command: `npx vite build`
- Start command: `npx vite preview --host 0.0.0.0 --port $PORT`
- No first-release frontend env vars are required

#### Frontend setup sequence

1. Add a second Railway service from the same GitHub repository.
2. Point the service root to `frontend`.
3. Set the build command to `npx vite build`.
4. Set the start command to `npx vite preview --host 0.0.0.0 --port $PORT`.
5. Deploy once on the Railway-generated domain before attaching the custom domain.
6. After the backend custom domain is live, confirm the SPA resolves relative `/api/*` calls to `https://api.<domain>` automatically.

### Database

- Use Railway Postgres for the first production release
- Keep production isolated from local dev/test databases
- Confirm migration execution before public cutover

#### Database setup notes

- Let Railway inject the production `DATABASE_URL`.
- Keep `PORT` unset in Railway unless a specific manual override is required; Railway injects its own listening port.
- Run migrations against the Railway database before public cutover.

---

## 6. Cloudflare

### Website

- Cloudflare Pages project root: `website`
- Cloudflare Pages framework preset: `Next.js (Static HTML Export)`
- Cloudflare Pages build command: `npm run build`
- Cloudflare Pages build output directory: `out`
- Production env variable:
  - `NEXT_PUBLIC_APP_URL=https://app.thepolicyforge.com`

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
- Cloudflare proxying does not break app or API traffic

---

## 9. Answer To The Repository Boundary Question

**Will this only publish the Cleaned folder?**

Yes.

- The Git repository root is the `Cleaned/` folder.
- Only files inside that folder are committed and pushed.
- `policy-forge-chat (BackUp)/` is outside this repository and is not published.
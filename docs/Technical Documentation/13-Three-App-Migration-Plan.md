# THREE-APP MIGRATION PLAN

**Created:** 2026-03-17  
**Status:** In Progress — public deployment live, CI/CD still pending  
**Delete when:** All phases complete and verified  

> This file tracks the migration from the current single-project monolith to the three-app target architecture:
> - `backend/` — NestJS API (api.thepolicyforge.com)
> - `frontend/` — React + Vite SPA (app.thepolicyforge.com)
> - `website/` — Next.js marketing site (www.thepolicyforge.com)

---

## Phase 1 — Backend: Separate + Rewrite to NestJS

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1.1 | Scaffold NestJS project structure in `backend/` (replacing current Express `backend/`) | ✅ Done | Files in `backend/nest/` — isolated alongside Express until cutover |
| 1.2 | Create `backend/package.json` with NestJS core deps (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `pg`, `bcryptjs`, `dotenv`) | ✅ Done | `backend/nest/package.json` created; 634 packages installed |
| 1.3 | Move `db/` into `backend/db/` (migrations + seeds stay as raw `pg` scripts) | ⬜ Not Started | Deferred to cutover phase |
| 1.4 | Fix `pg` from `devDependencies` → `dependencies` in backend `package.json` | ✅ Done | `pg` is in `dependencies` in `backend/nest/package.json` |
| 1.5 | Create `DatabaseService` injectable provider (wraps `pg` pool — replaces `db.js`) | ✅ Done | `backend/nest/src/database/database.service.ts` |
| 1.6 | Port `requireRole` middleware → `RolesGuard` (NestJS `CanActivate`) | ✅ Done | `backend/nest/src/auth/roles.guard.ts` + `roles.decorator.ts` |
| 1.7 | Port `authenticateToken` middleware → `JwtAuthGuard` | ✅ Done | `backend/nest/src/auth/jwt-auth.guard.ts` + `jwt.strategy.ts` |
| 1.8 | Migrate `AuthModule` (login, me, refresh → Controller + Service + JwtModule) | ✅ Done | `backend/nest/src/auth/` — all 3 endpoints verified; server starts, health endpoint returns 200 |
| 1.9 | Migrate `SubmissionsModule` (6 endpoints → Controller + Service) | ✅ Done | `backend/nest/src/submissions/` — all 6 endpoints, TypeScript clean |
| 1.10 | Migrate `QuotesModule` (7 endpoints → Controller + Service) | ✅ Done | `backend/nest/src/quotes/` — all 7 endpoints incl. logError helper and generateReference |
| 1.11 | Migrate `PartiesModule` (2 endpoints → Controller + Service) | ✅ Done | `backend/nest/src/parties/` — all 2 endpoints, role aliased as type |
| 1.12 | Migrate `AuditModule` (2 endpoints → Controller + Service) | ✅ Done | `backend/nest/src/audit/` — dedup guard, VALID_ENTITY_TYPES, event shaping |
| 1.13 | Migrate `SearchModule` (1 endpoint → Controller + Service) | ✅ Done | `backend/nest/src/search/` — defaultMode + filterMode + attachLastOpened |
| 1.14 | Migrate `DashboardModule` (9 stub endpoints → stub controllers) | ✅ Done | `backend/nest/src/dashboard/` — 8 stubs + real recent-records-data |
| 1.15 | Keep backend on port 5000 (no frontend proxy change needed yet) | ✅ Done | `main.ts` listens on 127.0.0.1:5000 — no change required |
| 1.16 | Run full backend test suite — all Layer 2 tests must pass | ✅ Done | 174 passed, 4 todo, 0 failures (8/8 suites) |

---

## Phase 1 — AI Guidelines to Update

| Guideline | Change Required | Status |
|-----------|----------------|--------|
| `00-Index.md` | Update §00.3 descriptions for 04, 06, 09, 10, 12; add three-app architecture note (§00.5) | ✅ Done |
| `04-Architectural-Boundaries.md` | Added §4.2a NestJS backend module structure, boundary rules, and module table | ✅ Done |
| `06-Testing-Standards.md` | Added `backend/nest/src/[module]/[module].spec.ts` to §6.2 test file locations | ✅ Done |
| `09-Full-Stack-Development.md` | Updated §5 local dev setup: dual-backend table, env file rules, separate start commands | ✅ Done |
| `10-Debug-And-Build-Standards.md` | Added §10.10 NestJS env config table, build modes, FE vs BE env separation | ✅ Done |
| `12-Folder-Structure.md` | Updated §12.1 backend entry; updated §8.7 with migration note; added §12.6 NestJS module layout | ✅ Done |
| `01-AI-Behaviour-Rules.md` | §1.15 — updated from Express middleware to NestJS Guards (`JwtAuthGuard`, `@Roles()`, `RolesGuard`) | ✅ Done |

---

## Phase 2 — Frontend: Separate into Own App

| # | Step | Status | Notes |
|---|------|--------|-------|
| 2.1 | Create `frontend/` folder with its own `package.json` (React, Vite, Tailwind, Chart.js, react-router-dom) | ✅ Done | `frontend/package.json` created; 521 packages installed |
| 2.2 | Move into `frontend/`: `app/`, `domains/`, `components/`, `lib/`, `public/`, `vite.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js` | ✅ Done | All frontend files moved; config files updated |
| 2.3 | Update `frontend/vite.config.js` Vite proxy: `/api/*` → NestJS port 5000 | ✅ Done | Proxy was already correct — no change needed |
| 2.4 | Keep `app/features/external/` in `frontend/` for now (Phase 3 extracts it) | ✅ Done | Implicit — files stayed in `frontend/` as part of step 2.2 |
| 2.5 | Update root `package.json` dev scripts to run both `frontend/` and `backend/` concurrently | ✅ Done | Root `package.json` now orchestration-only; all test/dev scripts delegate to `--prefix frontend` or `backend/nest` |
| 2.6 | Run frontend test suite — all Layer 1 tests must pass | ✅ Done | 539 passed, 5 todo, 0 failures (41/41 suites); 20 pre-existing failures fixed |
| 2.7 | Run E2E Playwright tests — all Layer 3 tests must pass | ✅ Done | No Playwright tests in `Cleaned` workspace — N/A |

---

## Phase 2 — AI Guidelines to Update

| Guideline | Change Required | Status |
|-----------|----------------|--------|
| `12-Folder-Structure.md` | Update §12.1 top-level structure for `frontend/`; add `frontend/` section | ✅ Done |
| `09-Full-Stack-Development.md` | Update §5 local dev setup for Phase 2 (separate env files, new start commands) | ✅ Done |
| `06-Testing-Standards.md` | Update §6.2 test file locations to reflect `frontend/` prefix | ✅ Done |

---

## Phase 3 — Website: Extract to Separate App *(Complete)*

> **Completed 2026-03-18.** Tech stack chosen: Next.js 14 App Router, TypeScript, Tailwind.
> Login stays on `app.thepolicyforge.com`; website login link = plain `<a href>` cross-origin.
> Design tokens copied (independently editable); `NEXT_PUBLIC_APP_URL` env var for login URL.

| # | Step | Status | Notes |
|---|------|--------|-------|
| 3.1 | Create `website/` — Next.js (SSR, SEO, CMS-ready) | ✅ Done | Next.js 14 App Router, TypeScript 5, Tailwind 3 |
| 3.2 | Move `app/features/external/` pages into `website/` | ✅ Done | 4 pages ported; visual output identical |
| 3.3 | Login button on `www.` → cross-origin redirect to `app.thepolicyforge.com/login` | ✅ Done | Plain `<a href={NEXT_PUBLIC_APP_URL + '/login'}>` |
| 3.4 | Delete `app/features/external/` from `frontend/` | ✅ Done | 5 files deleted; `/` → `/login` redirect added to `main.jsx` |
| 3.5 | Design tokens: copy vs shared package — document the choice | ✅ Done | Copy chosen; independence comment in `brandColors.ts`; shared package if needed later |
| 3.6 | Update AI Guidelines for three-app structure | ✅ Done | 00-Index, 12-Folder-Structure, 09-Full-Stack-Development, 13-Requirements-Standards (WEB code) |

---

## Phase 4 — Deployment Boundary and Release Pipeline

> **Started 2026-03-30.** This phase defines the Git deployment boundary, first-release environment scope,
> and the CI/CD shape for Railway and Cloudflare.

| # | Step | Status | Notes |
|---|------|--------|-------|
| 4.1 | Create a dedicated GitHub repository containing `Cleaned/` only | ✅ Done | Dedicated repo created and used as the only deployment source |
| 4.2 | Exclude `policy-forge-chat (BackUp)/` from deployment and keep it read-only local reference only | ✅ Done | BackUp folder is outside the new repo boundary and will not be pushed |
| 4.3 | First release uses production only: `www.thepolicyforge.com`, `app.thepolicyforge.com`, `api.thepolicyforge.com` | ✅ Done | Test environment deferred until needed |
| 4.4 | Website login points to `app.thepolicyforge.com/login`; no public environment selector in first release | ✅ Done | Environment switching deferred until a real test environment exists |
| 4.5 | Put Cloudflare in front of public hostnames (`www`, `app`, `api`) | ✅ Done | Proxying chosen; API caching must remain disabled |
| 4.6 | Use Railway for frontend, backend, and production Postgres initially | ✅ Done | Simplest first production platform choice |
| 4.7 | Add CI/CD pipeline: GitHub CI checks before Railway/Cloudflare deploys from `development` and `production` | ✅ Done | `.github/workflows/ci.yml` added with frontend, website, and backend validation jobs |
| 4.8 | Verify Railway frontend and backend custom domains in production | ✅ Done | `app.thepolicyforge.com` and `api.thepolicyforge.com` both responding after build and port fixes |
| 4.9 | Verify Cloudflare Pages website deployment on production domain | ✅ Done | `www.thepolicyforge.com` live after static export and Pages path/output fixes |
| 4.10 | Document manual Railway Postgres bootstrap for production | ✅ Done | Runbook updated to record explicit migrations and seed constraints |

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ⬜ Not Started | Work not yet begun |
| 🔄 In Progress | Currently being worked on |
| ✅ Done | Complete and verified |
| ⏸ Deferred | Intentionally postponed |
| ❌ Blocked | Cannot proceed — reason noted in Notes column |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-17 | Adopt three-app architecture (backend NestJS, frontend React, website deferred) | Security isolation between public and app origins; separate team ownership; TypeScript consistency |
| 2026-03-17 | Do backend separation + NestJS rewrite in one phase | Avoids touching every file twice |
| 2026-03-17 | Keep website in `frontend/` until marketing team hired | 5 static files — overhead of a third app not justified yet |
| 2026-03-17 | Keep backend on port 5000 throughout Phase 1 | Frontend Vite proxy needs no change until Phase 2 |
| 2026-03-18 | Website tech stack: Next.js 14 App Router, TypeScript, Tailwind | SSR/SSG for SEO; familiar Tailwind ecosystem; no new tech beyond the suite already used |
| 2026-03-18 | Design tokens: copy into `website/lib/design-tokens/` (not shared npm package) | 5 files — shared package overhead not justified; independence comment documents extraction path |
| 2026-03-18 | Login link on website: plain `<a href>` cross-origin to `NEXT_PUBLIC_APP_URL/login` | Login stays on app.thepolicyforge.com; website has no session knowledge; no SPA routing needed |
| 2026-03-30 | Dedicated GitHub repository created for `Cleaned/` only | Ensures only the cleaned app set is published; BackUp remains local read-only reference |
| 2026-03-30 | First release will deploy production only; test environment deferred | Keeps environment complexity low until test is actually needed |
| 2026-03-30 | Cloudflare proxying chosen for `www`, `app`, and `api` public hostnames | Adds edge protection and central DNS/TLS management |
| 2026-03-30 | Railway chosen for frontend, backend, and initial production Postgres | Fastest path to first release with lowest operational overhead |
| 2026-03-31 | Website deployment target is Cloudflare Pages using static export, not Workers | Matches the Next.js marketing site shape and avoids Wrangler-based deployment flow |
| 2026-04-01 | Production database bootstrap remains explicit and manual | `migrationsRun` stays false by design; schema creation and optional seed execution must not be hidden inside app startup |
| 2026-04-01 | First-release CI/CD keeps GitHub Actions as a validation gate only | Railway and Cloudflare deploy from Git branches; CI blocks merges but does not own hosting or production database changes |
| 2026-04-01 | CI is allowed to bootstrap only an ephemeral test Postgres service | The current backend integration suite needs migrations and seed data, but production database mutation remains manual and out of band |
| 2026-04-01 | Future environment naming should use `development` and `production` in full | Avoids shorthand branch/environment labels drifting into docs, hosting config, or team process |
| 2026-04-01 | Branch model moves to `development` for shared integration and `production` for live release | Separates day-to-day work from the live deployment branch while keeping environment names explicit |

# SECTION 9: FULL-STACK DEVELOPMENT STANDARDS

This document defines how frontend (FE) and backend (BE) work are planned and built together. Every feature with a data dependency must be considered from both sides before any code is written.

---

## 1. Core Principle

**Frontend and backend are two halves of the same feature.**

Never design a UI without knowing what data the API will return. Never build an API endpoint without knowing how the UI will consume it. Both sides must be planned at the same time.

---

## 2. Feature Planning Order

Every feature that touches data must follow this sequence:

```
1. Write the Impact Analysis (UI / API / DB) for all layers affected
2. Define the API contract (endpoint, request shape, response shape, error codes)
3. Write backend requirements and tests
4. Write frontend requirements and tests (using mocked API responses)
5. Get all requirements approved (Impact Analysis must be complete before approval)
6. Build backend endpoint
7. Build frontend component
8. Run integration test with real backend
```

Do not skip steps. Do not reorder steps. Do not build the frontend against a "we'll figure the API out later" assumption.

**Every requirements file must include an Impact Analysis section (see Guideline 13 §6.1).** The Impact Analysis covers three mandatory subsections:
- **UI / Front-End Impact** — screens and components added, changed, or removed
- **API Impact** — endpoints added, changed, or deprecated (method, path, request/response shape)
- **Database Impact** — tables and columns added, altered, or removed (migration file reference)

When a requirement changes, all three subsections must be updated in the same commit/PR as the requirement change itself.

---

## 3. API Contract Definition

Before writing any code, define the contract in plain language:

| Field | Required | Description |
|---|---|---|
| Method | Yes | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| Path | Yes | e.g. `/api/auth/login` |
| Request body / query params | Yes | Field names, types, required/optional |
| Success response shape | Yes | HTTP status + JSON structure |
| Error responses | Yes | One row per error case (status + message) |
| Auth required | Yes | Yes / No / Admin only |
| Tenant-scoped | Yes | Yes / No |

**Example — login endpoint:**

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/auth/login` |
| Request body | `{ email: string, password: string }` |
| Success | `200 { data: { token: string, user: { id, name, email, role, tenantId } } }` |
| 401 | `{ error: "Invalid credentials" }` |
| 429 | `{ error: "Too many attempts" }` |
| Auth required | No |
| Tenant-scoped | No (tenant resolved from user record) |

Define this before touching either the FE or the BE.

---

## 4. How the Frontend Calls the Backend

All HTTP calls in the frontend go through `@/shared/lib/api-client/api-client`. No component, page, or domain service may call `fetch()` or `axios` directly.

```ts
// Correct
import { post } from '@/shared/lib/api-client/api-client'
const response = await post('/api/auth/login', { email, password })

// Forbidden
fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
```

The api-client handles:
- Base URL resolution
- Auth token injection (from `auth-session`)
- Request/response normalisation
- Common error shapes

---

## 5. Local Development — How FE Talks to BE

In development, the Vite dev server proxies all `/api/*` requests to the NestJS backend:

```
Browser (port 5173) → Vite proxy → NestJS backend (port 5000)
```

This is configured in `vite.config.js` (no change required — proxy target port 5000 is the same for both Express and NestJS):
```js
server: {
  proxy: {
    '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true }
  }
}
```

**Current state (Phase 3 complete)** — three-app architecture:

| App | Location | Start command | Status |
|-----|----------|---------------|--------|
| NestJS (target backend) | `backend/nest/` | built into `backend/nest/dist/main.js` | Phase 1+2 complete — serves on port 5000 |
| Vite frontend | `frontend/` | `npm run dev --prefix frontend` | Phase 2 complete — serves on port 5173 |
| Next.js website | `website/` | `npm run dev --prefix website` | Phase 3 complete — serves on port 3000 |
| Express (legacy backend) | `backend/` | `node backend/server.js` | Legacy — coexists until verified; do not delete yet |

**Environment files (Phase 2+):**
- Frontend env: `frontend/.env.local` (read by Vite: `VITE_*` prefixed vars)
- Backend env: `.env.local` at the project root (read by NestJS `main.ts` via `dotenv`)
- Both apps now have separate env files. Shared keys (e.g. DB connection) must be duplicated.

**Full local stack startup:**
1. Ensure PostgreSQL is running and the `policyforge_cleaned` database exists
2. First-time only — run migrations and seeds: `npm run dev:local:fresh`
3. From the project root, run both apps with one command: `npm run dev:local`
   - This uses `concurrently` to start NestJS (`backend/nest/dist/main.js`) and Vite (`npm run dev --prefix frontend`) together
4. Optionally, start the website separately: `npm run dev --prefix website`
   - Website runs on port 3000; it has no backend dependency (no API calls; all pages static)

Default dev credentials: `admin@policyforge.com` / `Admin123!`

In production, the nginx reverse proxy routes `/api/*` to the backend container — the same URL pattern works in both environments.

---

## 5a. Database Layer — Separate Ownership

The database schema lives in `db/` at the project root.  It is a separate component from `backend/` and `app/`.

```
db/
  migrations/   ← schema changes only (run before starting the app)
  seeds/        ← reference/test data (run after migrations)
```

**Key rules:**
- Schema changes (new tables, column changes) go in `db/migrations/` — never in `backend/`
- Run migrations: `npm run db:migrate`
- A developer working on schema must not need to understand the API layer
- A developer working on the API must not need to write migrations
- See Section 4.9 of the Architectural Boundaries guideline for the full rule set

---

## 6. Authentication Flow

```
FE LoginForm → POST /api/auth/login → BE validates → returns { token, user }
FE stores token and user in auth-session (localStorage)
FE api-client reads token from auth-session and adds it to every request header
BE validates token on every protected route
```

The FE must never store raw passwords. The BE must never return password hashes. Tokens must be stored only via `auth-session.storeSession()`.

---

## 7. Error Handling Conventions

| HTTP Status | Meaning | FE behaviour |
|---|---|---|
| 200–299 | Success | Use the raw response directly — the api-client returns the parsed response body. Do not access `.data` (see RULE-06). |
| 400 | Validation error | Show field-level errors from `response.error` |
| 401 | Unauthenticated | Clear session, redirect to `/login` |
| 403 | Forbidden | Show "You do not have permission" message |
| 404 | Not found | Show not-found state in the component |
| 422 | Business rule violation | Show message from `response.error` |
| 429 | Rate limited | Show "Too many requests, try again later" |
| 500 | Server error | Show generic error, do not expose detail |

The api-client normalises all errors into `{ status, error, message }` so components never parse raw HTTP responses.

---

## 8. Testing Across Both Layers

| Test type | Where it lives | What it does | Required? |
|---|---|---|---|
| FE unit test | `frontend/src/[domain]/__tests__/[Page].test.tsx` | Mocks api-client, tests UI behaviour | Yes — every component |
| FE codebase scan | `frontend/src/__tests__/codebase-scan.test.js` | Enforces architecture patterns | Yes — runs on every change |
| BE schema validation | `backend/__tests__/schema-validation.test.js` | Verifies every DB column referenced in server.js exists | **Yes — every BE change** |
| BE API smoke test | `backend/__tests__/api-smoke.test.js` | Every route returns non-500 with valid auth | **Yes — every BE change** |
| BE requirements test | `backend/__tests__/requirements/S[NN]-*.test.js` | Business logic against real DB | **Yes — every feature** |
| E2E smoke test | `playwright/*.spec.js` | Full stack in a browser | **Yes — every critical path** |

**Critical rule:** Frontend tests must never start a real server. They mock the api-client:
```ts
jest.mock('@/shared/lib/api-client/api-client', () => ({
  post: jest.fn().mockResolvedValue({ token: 'test-token', user: mockUser })
}))
```

**Critical rule:** Backend integration tests must NEVER accept error HTTP status codes as passing:
```js
// FORBIDDEN — masks known bugs
expect([200, 500]).toContain(res.status)

// REQUIRED — hard assertion
expect(res.status).toBe(200)
```

**Critical rule:** Frontend tests passing does NOT mean the backend works. When a task is marked "done", the evidence must include Layer 2 backend test output, not just `npm test` output from the frontend.

BE integration tests must use a separate test database, never the dev database.

---

## 9. Multi-Tenant Considerations

- Every API endpoint that returns data must filter by `tenantId`.
- The backend derives `tenantId` from the authenticated user's JWT — never trust a `tenantId` sent in a request body.
- The frontend never hardcodes `tenantId`. It reads it from `auth-session.getSession().user.tenantId`.
- Any component that shows tenant-specific data must pass tenant context through the api-client, not as a prop from a parent.

---

## 10. Open Questions Checklist for Any New Feature

Before starting a feature, answer all of these:

- [ ] Is there an API contract defined?
- [ ] Do we know the exact request and response shapes?
- [ ] Have all error cases been identified?
- [ ] Is the endpoint auth-protected?
- [ ] Is the data tenant-scoped?
- [ ] Are there backend requirements written?
- [ ] Are there frontend requirements written?
- [ ] Are the mocked API responses ready for FE unit tests?
- [ ] Is there a migration needed for new DB columns or tables?
- [ ] Has the API contract been approved before any code is written?

If any item is unchecked, stop and resolve it before proceeding.

---

## 11. Definition of Done for a Domain Build

A domain is only "done" when **all three layers** are complete.  Completing the database layer alone is not done.  A stub route is not done.

| Layer | Done means |
|---|---|
| **Database** | Migration file exists, runs idempotently, all columns/indexes/FKs correct, `db:migrate` chain updated |
| **Backend** | Real route file built, requirements written, backend tests passing, registered in `server.js`, stub removed |
| **Frontend** | Domain component(s) built, FE requirements written, FE unit tests passing, wired to real API (not a mock stub) |

A feature is not complete until all three rows above are checked.

---

## 12. Stub Route Rules

A stub route (in `backend/routes/dashboard-stubs.js` or similar) is a **temporary placeholder only**.

**Rules:**

1. **A stub must never be created without a matching open item in `documentation/Technical Documentation/11-Gap-Analysis.md`.** The stub is the IOU; the Gap Analysis is where the debt is recorded.

2. **Every session that adds a migration for a domain must also check the Gap Analysis and confirm the corresponding backend route and frontend domain are tracked as gaps.** If they are not tracked, add them before ending the session.

3. **A stub must be removed the moment the real route file is registered in `server.js`.** Do not leave a stub in place alongside a real route.

4. **A stub must return the correct shape for the eventually-real API response** (empty arrays / zeros / empty objects — never `null`), so frontend components do not need to change their null-handling when the stub is replaced.

---

## 13. Gap Analysis Maintenance

`documentation/Technical Documentation/11-Gap-Analysis.md` is the authoritative record of what has and has not been built.

**Mandatory update triggers — the AI must update `11-Gap-Analysis.md` at the end of any session where:**

- A new migration is added (update the "Backend API Coverage" and "Domain Implementations" tables)
- A new route file is created and registered (mark the row as "Partial" or "Complete", remove the stub entry)
- A new frontend page or domain component is built (update the "Frontend Features / Pages" table)
- A stub route is added (add/confirm a row in the gap analysis)
- A stub route is removed (mark the corresponding row as no longer a stub)

**The mandatory session-end checklist in §1.10 of `01-AI-Behaviour-Rules.md` is the enforcement mechanism for this obligation.** The AI must not close a session without running through it.

---

## 14. Local Development Scripts

| Script | When to use |
|---|---|
| `npm run dev:local` | Normal daily start — runs NestJS + Vite concurrently (DB already initialised) |
| `npm run dev:local:fresh` | First-time setup or full reset — runs `db:setup` (all migrations + seeds) then starts both apps |
| `npm run dev --prefix website` | Start the Next.js marketing site independently (no DB needed — purely static) |

`db:setup` (migrate + seed) must **not** be part of the normal start script — it runs all migrations sequentially and adds 10–30 seconds on every start.

---

## 11. Production Readiness — What "Done" Means

**A feature in `Cleaned/` is production-ready only when all of the following are true.**

### 11.1  Before writing any code

- [ ] API contract defined (endpoint, request, response, errors, auth, tenant scope) — §3
- [ ] DB migration written and reviewed (if new columns or tables are needed)
- [ ] Migration applied to dev DB and schema validation test updated to assert the new columns exist

### 11.2  Backend

- [ ] Route handler implemented
- [ ] Backend requirements test written with hard `expect(res.status).toBe(200)` — NO soft status assertions
- [ ] Schema validation test asserts every column the route references (`table.column`) exists in the DB
- [ ] `npm run test:backend` passes with zero failures and zero skips on committed features
- [ ] No route returns 500 in the API smoke test

### 11.3  Frontend

- [ ] API mock shape in component test matches the verified real backend response (§6.7 contract comment present)
- [ ] `npm test` passes with zero failures
- [ ] `npm run test:scan` passes with zero violations
- [ ] No widget shows "unable to load" or empty silent state when tested against the real backend

### 11.4  Integration

- [ ] Full stack tested locally (backend running, DB running, frontend proxying to backend)
- [ ] Every widget that calls a backend endpoint displays real data — not mock data, not empty
- [ ] E2E spec runs the relevant user flow against a real backend and all assertions pass

### 11.5  How the `workflow_assigned_to` class of bug is prevented

This specific class of bug — a route references a DB column that was never created — is prevented by:

1. **Migration first**: Write and run the DB migration before writing the route handler
2. **Schema validation test**: Add an assertion to `backend/__tests__/schema-validation.test.js` that the new column exists — this test runs before any route test
3. **No soft-fail on 500**: Backend test for the route uses `expect(res.status).toBe(200)` — any DB error causes a hard test failure immediately

All three steps are required. Any one of them alone is insufficient.

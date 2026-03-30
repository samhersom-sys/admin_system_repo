# AI GUIDELINES — SECTION 10: DEBUG AND BUILD STANDARDS

This document defines how the application surfaces information to developers during
development, and how it restricts that information in production builds.  Every
contributor must follow these rules when creating or modifying any front-end file.

---

## 10.1  The Core Principle: Security Lives on the Backend

**You cannot make a browser application truly opaque to its users.**

The browser DevTools Network tab always shows every HTTP request, its URL, the request
body, the response body, and all headers.  There is nothing the frontend can do to hide
this traffic.  A determined user can always read the responses your API sends them.

The implication is fundamental:

> **The API must only return data the authenticated user is authorised to see.**
> Never rely on the frontend to hide data.  A field omitted from the UI is still
> readable in the Network tab if the API included it in the response.

What the frontend *can and must* control:

| Layer | Dev behaviour | Prod behaviour |
|-------|---------------|----------------|
| **JavaScript source code** | Source maps enabled — readable file names and line numbers in DevTools Sources | No source maps — minified, mangled identifiers |
| **Console output** | Full request/response logging via `logger` | All logger calls are dead-code eliminated from the bundle |
| **Error messages** | `ErrorBoundary` shows full `error.message` + stack trace | `ErrorBoundary` shows generic "Please refresh or contact support" |
| **Network requests** | Always visible in DevTools — design APIs around this assumption | Always visible — the API returns only authorised data |

---

## 10.2  Environment Modes

Vite builds in two modes:

| Mode | Triggered by | `process.env.NODE_ENV` | `import.meta.env.DEV` |
|------|-------------|------------------------|----------------------|
| Development | `npm run dev` | `'development'` | `true` |
| Production | `npm run build` | `'production'` | `false` |
| Test | `npx jest` | `'test'` | N/A (not Vite) |

**Use `process.env.NODE_ENV` (not `import.meta.env.DEV`) in all runtime gating.**

Reason: `import.meta.env` is a Vite-only concept.  In Jest (`jsdom`) it is not defined.
`process.env.NODE_ENV` is always defined and Vite replaces it with a string literal at
build time, so dead-code elimination still works correctly.

```ts
// ✅ Works in both Vite and Jest
const isDev = process.env.NODE_ENV !== 'production'

// ❌ Not defined in Jest — causes runtime errors in tests
const isDev = import.meta.env.DEV
```

---

## 10.3  Source Maps

Source maps translate minified production code back to original source files.  They are
powerful debugging tools — and powerful information-leakage vectors.

`vite.config.js` must always have:

```js
build: {
  sourcemap: false,   // No source maps served to browsers in production
  minify: 'esbuild',  // Mangle identifiers; remove dead code (logger calls etc.)
}
```

**`sourcemap: false`** means the DevTools Sources panel shows minified code only.
Users cannot read class names, variable names, file paths, or business logic.

**Exception — error tracking services (e.g. Sentry):** If you add a third-party error
tracker, set `sourcemap: 'hidden'` instead of `false`.  Hidden source maps are generated
and uploaded to the tracker but are **not** served to browsers — the tracker uses them
privately to demangle stack traces in error reports.

```js
// With Sentry (future):
sourcemap: 'hidden',  // Upload to Sentry, do not expose to browsers
```

**Violation:** Setting `sourcemap: true` or `sourcemap: 'inline'` in `vite.config.js`
is a critical security violation.  It causes the full original source code — including
all file paths, variable names, component structure, and business logic — to be served
directly to browsers.  The AI must never set this value and must flag it immediately if
found.  `.map` files must never be committed to production deployment artefacts;
deployment steps must explicitly exclude `dist/**/*.map` from any CDN upload, Docker
`COPY` step, or static file server directory.

---

## 10.4  The Logger Rule — No Direct `console.*` Calls

### Rule
No application source file may call `console.log`, `console.warn`, or `console.error`
directly.  All debug output must go through `@/lib/logger/logger`.

```ts
// ❌ Forbidden — appears in production build, visible to all users
console.log('Fetching data', url)
console.error('API call failed', err)

// ✅ Correct — no-op in production, full output in development
import { logger } from '@/lib/logger/logger'
logger.log('Fetching data', url)
logger.error('API call failed', err)
```

**Why this matters:**
- `console.log` statements in a production build appear verbatim in the browser DevTools
  Console.  They may expose endpoint URLs, user data, session tokens, error details, or
  internal architecture that you intended only developers to see.
- The `logger` utility solves this with a single guard: if
  `process.env.NODE_ENV === 'production'`, every logger method is a no-op.  Vite's
  dead-code elimination then removes the no-op calls entirely from the bundle — they do
  not even exist in the shipped JavaScript.

### The codebase scan enforces this rule
RULE-09 in `frontend/src/__tests__/codebase-scan.test.js` scans every non-test source file and
fails the test suite if any direct `console.(log|warn|error)` call is found outside
`frontend/src/shared/lib/logger/logger.ts`.

### Only allowed exception
`frontend/src/shared/lib/logger/logger.ts` — it is the console wrapper and must call `console.*` internally.

---

## 10.5  Logger API Reference

Import: `import { logger } from '@/shared/lib/logger/logger'`

| Method | Purpose | When to use |
|--------|---------|-------------|
| `logger.log(...args)` | General informational message | State changes, lifecycle events |
| `logger.warn(...args)` | Non-fatal warning | Degraded state, fallback triggered |
| `logger.error(...args)` | Error detail | Caught exceptions, unexpected states |
| `logger.request(method, url, body?)` | Outgoing API request | Called in `api-client` before `fetch()` |
| `logger.response(method, url, status, body?)` | Successful API response | Called in `api-client` after `handleResponse` |
| `logger.apiError(method, url, status, detail?)` | Failed API response | Called in `api-client` error branch |

All methods are **no-ops in production**.  All methods are **active in test**
(so test output includes log lines when tests fail, helping you debug).

---

## 10.6  The Error Boundary Rule

`frontend/src/main.jsx` must always wrap the router in `<ErrorBoundary>` from
`@/shared/components/ErrorBoundary/component`.  See §3.7 of `03-Three-Artifact-Rule.md`.

The `ErrorBoundary` is environment-aware:

| Environment | What the user sees |
|-------------|-------------------|
| Development | "Something went wrong" + `error.message` + full stack trace in a red box |
| Production | "Something went wrong" + "An unexpected error occurred. Please refresh the page or contact support." |

This means a developer testing locally gets full diagnostic output.  A user hitting a
bug in production sees a polite generic message with no implementation detail.

---

## 10.7  What Users Can Always See in DevTools

Even with source maps disabled and the logger stripped, the following is always visible
to any user in the browser DevTools:

| DevTools tab | What is visible |
|---|---|
| **Network** | Every HTTP request URL, method, request headers, request body, response headers, response body, timing |
| **Sources** | The minified JavaScript bundle (unreadable but present) |
| **Application** | `localStorage` contents — including the session token and user object stored by `auth-session` |
| **Console** | Any unhandled JavaScript errors (browser-generated, not app-generated) |

**Design your API accordingly:**

1. **Never include sensitive fields in API responses unless the user is authorised to
   see them at the database level** — hiding a field in the UI does not hide it from
   the Network tab.
2. **Treat `localStorage` as readable by the user** — do not store anything in
   `auth-session` that should be secret (the token is expected to be there; private keys
   or passwords must never be stored there).
3. **Do not put secrets in query string parameters** — they appear verbatim in the
   Network tab URL column and in server access logs.

---

## 10.8  Debugging a Scenario in DevTools

### Step 1 — Open DevTools

`F12` (or right-click → Inspect).

### Step 2 — Network tab

Filter by `Fetch/XHR`.  Every API call the app makes appears here.  Click a request to
see:

- **Headers** — the `Authorization: Bearer <token>` and `x-org-code` values from each
  request (useful for confirming auth is attached correctly)
- **Payload** — the exact JSON body sent
- **Preview / Response** — the exact JSON the server returned, including any error object

In development, the logger additionally groups all of this in the **Console** tab with
`[PF]` prefixes and the method/URL, making it easy to trace a sequence of calls.

### Step 3 — Console tab

In development builds, every api-client call produces a collapsible group:

```
▶ [PF] ▶ POST /api/auth/login
    Request body: { email: "admin@...", password: "..." }

▶ [PF] ✓ 200 POST /api/auth/login
    Response: { token: "...", user: { ... } }
```

Failed calls show:

```
▶ [PF] ✗ ERROR 401 POST /api/auth/login
    Detail: { message: "Invalid credentials" }
```

### Step 4 — Sources tab (development only)

In development, Vite serves full source maps inline.  The Sources panel shows the real
file tree (`app/`, `lib/`, `components/`), real file names, and real line numbers.
Breakpoints work against unminified code.

In production there are no source maps — only the mangled bundle.

---

## 10.9  Checklist for Every Feature

Before marking a feature complete, confirm:

- [ ] No `console.log/warn/error` calls in any new or modified source file
- [ ] Any new API call goes through `api-client` (not raw `fetch`)
- [ ] API responses only include fields the user is authorised to receive
- [ ] `npx vite build` succeeds with `sourcemap: false` and no warnings
- [ ] The feature is visible and functional in a local dev build (logger output aids diagnosis if not)
- [ ] The `ErrorBoundary` in `main.jsx` is still in place — do not remove it

---

## 10.10  NestJS Backend — Environment Configuration

The NestJS backend (`backend/nest/`) uses `dotenv` to load environment variables.  `main.ts` loads `.env.local` from the project root on startup via:

```ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '../../../.env.local' })  // relative to backend/nest/
```

### Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | No | `postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned` | PostgreSQL connection string |
| `JWT_SECRET` | Yes in prod | `dev-secret-change-me` | Signs and verifies JWT access tokens |
| `JWT_REFRESH_SECRET` | Yes in prod | `dev-refresh-secret-change-me` | Signs and verifies JWT refresh tokens |
| `CORS_ORIGINS` | No | permissive in dev | Comma-separated allowed origins for production CORS (`http://localhost:5173,https://app.policyforge.com`) |
| `NODE_ENV` | No | `development` | Controls `TestEntity` inclusion in audit VALID_ENTITY_TYPES |
| `PORT` | No | `5000` | Server listen port |

### Build Modes

| Mode | Command | Behaviour |
|------|---------|-----------|
| Development (watch) | `cd backend/nest && npm run start:dev` | ts compilation watch, auto-restart on change |
| Production build | `cd backend/nest && npm run build` | Compiles to `dist/` |
| Production start | `cd backend/nest && node dist/main.js` | Serves from compiled `dist/` |
| Unit tests | `cd backend/nest && npm test` | Runs `*.spec.ts` via Jest + `TestingModule` |

### FE vs BE Environment Separation

During Phase 1 (migration), both frontend and backend share `.env.local` at the project root.

**Frontend reads** — Vite exposes only `VITE_*` prefixed variables to the browser bundle.  Variables without the `VITE_` prefix are never included in the bundle.

**Backend reads** — NestJS reads all variables via `dotenv` (no prefix restriction).

**Security rule:** Never add `VITE_JWT_SECRET`, `VITE_DATABASE_URL`, or any other backend secret with the `VITE_` prefix.  Doing so would expose it in the browser bundle.

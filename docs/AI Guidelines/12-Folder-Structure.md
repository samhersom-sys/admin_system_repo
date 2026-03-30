# AI GUIDELINES — SECTION 12: FOLDER STRUCTURE

This document is the authoritative reference for the folder structure of the Policy Forge `Cleaned` architecture.  Every file in the project must have a clear home defined here.  The AI must enforce this structure at all times and raise an open question if a file's correct location is unclear.

---

## 12.1  Top-Level Structure

> **Phase 3 complete.** The website is now separated into `website/` (Next.js 14 App Router).
> `website/` has its own `package.json`, `jest.config.js`, Tailwind config, and design-token copy.
> Root-level files are orchestration only (`package.json` scripts delegate to `--prefix frontend`, `backend/nest`, or `--prefix website`).
>
> **Target architecture (G12-05):** `frontend/`, `backend/`, and `website/` each adopt a `src/` layout with module/controller/service pattern.  Each sub-project also gains a `docs/` subfolder for app-level documentation.  Individual module requirements and test files live **inside each module folder** (not in a centralised tree).  The frontend physical migration is complete — see §12.7 for the module pattern.

```
Cleaned/
  docs/                          ← Project documentation (renamed from documentation/)
    AI Guidelines/               ← Rules for how the AI must behave (read first)
    Project Documentation/       ← Architecture, domain, and workflow docs
    Technical Documentation/     ← Migration notes, plans, and open questions
  db/
    migrations/                  ← Numbered schema migration scripts (run in order)
    seeds/                       ← Reference and test data scripts
  developertools/                ← Developer utilities shared across all sub-projects (see §12.8)
    jest.backend.config.js       ← Jest config for backend integration tests (testEnvironment: node)
    check-all-types.js           ← DB type introspection script
    check-tables.js              ← DB table introspection script
    check-types.js               ← DB type comparison script
    clean-test-users.js          ← Removes test user records from the database
    list-columns.js              ← Lists all column definitions for a table
    list-tables.js               ← Lists all tables in the schema
    verify-auth-hash.js          ← Verifies a password hash against a stored bcrypt value
  frontend/                      ← React + Vite SPA (Phase 2 — app.policyforge.com)
    docs/                        ← Frontend-level documentation (architecture, overall requirements)
    src/                         ← All frontend source (replaces app/, domains/, components/, lib/)
      [module]/                  ← One folder per domain/feature — see §12.7 for pattern
      shared/
        components/              ← Reusable UI primitives (migrated from components/)
        lib/                     ← Shared services (migrated from lib/)
    index.html                   ← Stays at frontend/ root (Vite requirement)
    vite.config.js
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    package.json                 ← Frontend-only deps (React, Vite, Tailwind, Chart.js, etc.)
    jest.config.js               ← Frontend Jest config (testEnvironment: jsdom)
    jest.setup.ts
  website/                       ← Next.js 14 App Router (Phase 3 — www.policyforge.com)
    docs/                        ← Website-level documentation
    src/                         ← All website source (target — migration pending)
    app/                         ← Next.js App Router pages (current location, pre-migration)
    components/                  ← Shared UI (ExternalNavbar, etc.) (current location)
    lib/design-tokens/           ← Brand colour tokens (independent copy of frontend tokens)
    public/                      ← Static assets (website marketing images, icons)
    next.config.js
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    package.json                 ← Website-only deps (Next.js, React, Tailwind)
    jest.config.js               ← Website Jest config (testEnvironment: jsdom)
    jest.setup.ts
  backend/
    docs/                        ← Backend-level documentation
    src/                         ← NestJS source (target — currently at backend/nest/src/)
    nest/                        ← NestJS API — current location (will become backend/src/ after migration)
    server.js                    ← Express API (legacy — coexists during migration; delete at cutover)
    routes/                      ← Express route files (legacy)
    middleware/                  ← Express middleware (legacy)
  package.json                   ← Root orchestration only — no sub-project deps; scripts delegate to --prefix
  package-lock.json              ← Corresponds to root package.json (devDependencies only)
  docker-compose.yml             ← Infrastructure — starts Postgres for local development
  .env.local                     ← Development environment variables (committed; no real secrets)
  .env.test                      ← Test environment overrides (committed; points to test DB)
  .env.production                ← Production variable names with placeholders (committed; real values injected by CI/CD)
  .gitignore
```

---

## 12.8  developertools/ — Shared Developer Utilities

`developertools/` is the home for files and scripts that span all sub-projects and serve developers rather than the application itself.  Nothing in this folder runs in production.

**Why a dedicated folder?**  These files don't belong to `frontend/`, `backend/`, or `website/` because they work across all of them.  Putting them in a named folder makes their shared, non-production purpose explicit and avoids polluting the root with loose scripts.

**What belongs here:**
- Database diagnostic and introspection scripts used during development and debugging
- The backend integration test config (`jest.backend.config.js`) — it points to `backend/__tests__/` relative to the root and is separate from any sub-project's own Jest setup
- Any future one-off scripts, code generators, or maintenance utilities that aren't tied to a single sub-project

**What does NOT belong here:**
- `package.json` — npm requires it at the workspace root
- `.env.*` files — NestJS and migration scripts load them from fixed relative paths; moving them would break all sub-project env loading
- `docker-compose.yml` — Docker Compose defaults to the current directory; keeping it at root avoids mandatory `-f` flag boilerplate

---

## 12.2  Domains Folder

> **Deprecated.** This section describes the old `domains/` folder convention that preceded the module pattern.  It is superseded by §12.7 (Module / Controller / Service Pattern).  Use §12.7 as the authoritative reference for all new work.

```
domains/
  submissions/
    submissions.requirements.md
    submissions.test.ts
    submissions.ts
    components/
      SubmissionForm/
        requirements.md
        test.tsx
        component.tsx
      SubmissionStatusBadge/
        requirements.md
        test.tsx
        component.tsx

  quotes/
    quote.requirements.md
    quote.test.ts
    quote.ts
    components/
      QuoteSectionGrid/
        requirements.md
        test.tsx
        component.tsx
      CoverageDetail/
        requirements.md
        test.tsx
        component.tsx
      DeductionsPanel/
        requirements.md
        test.tsx
        component.tsx

  policies/
    policy.requirements.md
    policy.test.ts
    policy.ts
    components/
      PolicyHeader/
        requirements.md
        test.tsx
        component.tsx
      EndorsementPanel/
        requirements.md
        test.tsx
        component.tsx

  binding-authorities/
    binding-authority.requirements.md
    binding-authority.test.ts
    binding-authority.ts
    components/
      ...

  claims/
    claims.requirements.md
    claims.test.ts
    claims.ts
    components/
      ...

  parties/
    parties.requirements.md
    parties.test.ts
    parties.ts
    components/
      PartyCard/
        requirements.md
        test.tsx
        component.tsx

  finance/
    finance.requirements.md
    finance.test.ts
    finance.ts
    components/
      ...

  reporting/
    reporting.requirements.md
    reporting.test.ts
    reporting.ts
    components/
      DashboardWidget/
        requirements.md
        test.tsx
        component.tsx

  settings/
    settings.requirements.md
    settings.test.ts
    settings.ts
    components/
      ...

  auth/
    auth.requirements.md
    auth.test.ts
    auth.ts
    components/
      LoginForm/
        requirements.md
        test.tsx
        component.tsx
```

---

## 12.3  Workflows Folder

> **Deprecated.** This section describes the old `workflows/` convention.  Workflow modules now follow the same module pattern under `frontend/src/` (see §12.7).  Use §12.7 as the authoritative reference.

```
workflows/
  broker-led-submission/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  manual-submission/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  submission-assignment/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  clearance-checking/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  quote-to-policy/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  policy-endorsement/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  binding-authority-reporting/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  claim-lifecycle/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  data-quality-review/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts

  ai-email-intake/
    workflow.requirements.md
    workflow.test.ts
    workflow.ts
```

---

## 12.4  Shared Services Folder

Shared *services* are domain-agnostic utilities.  They carry no business data.  Folder: `frontend/src/shared/lib/` (under the `frontend` sub-project).  Import paths use `@/shared/lib/[service-name]`.

```
shared/
  event-bus/
      event-bus.requirements.md
      event-bus.test.ts
      event-bus.ts

    permissions/
      permissions.requirements.md
      permissions.test.ts
      permissions.ts

    notifications/
      notifications.requirements.md
      notifications.test.ts
      notifications.ts

    audit/
      audit.requirements.md
      audit.test.ts
      audit.ts

    auth-session/
      auth-session.requirements.md
      auth-session.test.ts
      auth-session.ts

    api-client/
      api-client.requirements.md
      api-client.test.ts
      api-client.ts

    formatters/
      formatters.requirements.md
      formatters.test.ts
      formatters.ts

    lookups/
      lookups.requirements.md
      lookups.test.ts
      lookups.ts
      data/
        countries.json
        riskCodes.json
        taxTable.json
        ...

    pdf-generator/
      pdf-generator.requirements.md
      pdf-generator.test.ts
      pdf-generator.ts

    email-scheduler/
      email-scheduler.requirements.md
      email-scheduler.test.ts
      email-scheduler.ts

    design-tokens/
      brandColors.ts
      brandClasses.ts
      global.css

    rating-engine/
      rating-engine.requirements.md
      rating-engine.test.ts
      rating-engine.ts
```

---

## 8.4a  Shared Modules Folder

> **Deprecated / Planned.** Shared modules are not yet implemented in the current architecture.  When implemented, they will follow the module pattern defined in §12.7 under `frontend/src/`.  `sharedmodules/` as a separate folder is no longer the target location.

```
sharedmodules/
  invoices/
    invoices.requirements.md
    invoices.test.ts
    invoices.ts
    components/
      InvoiceLineItems/
        requirements.md
        test.tsx
        component.tsx
      InvoiceSummary/
        requirements.md
        test.tsx
        component.tsx

  locations/
    locations.requirements.md
    locations.test.ts
    locations.ts
    components/
      LocationsTable/
        requirements.md
        test.tsx
        component.tsx
      LocationEntryForm/
        requirements.md
        test.tsx
        component.tsx
```

---

## 8.5  Reusable Components Folder

> **Deprecated.** This section describes the old `components/` folder convention.  Reusable UI primitives now live in `frontend/src/shared/components/` (see §12.7d).  Use §12.7d as the authoritative reference.

```
components/
  SectionGrid/
    requirements.md
    test.tsx
    component.tsx

  ResizableGrid/
    requirements.md
    test.tsx
    component.tsx

  Modal/
    requirements.md
    test.tsx
    component.tsx

  TabsNav/
    requirements.md
    test.tsx
    component.tsx

  SearchableSelect/
    requirements.md
    test.tsx
    component.tsx

  CheckboxSelect/
    requirements.md
    test.tsx
    component.tsx

  GridSearchableSelect/
    requirements.md
    test.tsx
    component.tsx

  PageHeader/
    requirements.md
    test.tsx
    component.tsx

  FieldGroup/
    requirements.md
    test.tsx
    component.tsx

  MetadataFieldInput/
    requirements.md
    test.tsx
    component.tsx

  AuditTable/
    requirements.md
    test.tsx
    component.tsx

  InstallmentsBox/
    requirements.md
    test.tsx
    component.tsx

  LoadingSpinner/
    requirements.md
    test.tsx
    component.tsx

  ErrorBoundary/
    requirements.md
    test.tsx
    component.tsx

  FinancialViewToggle/
    requirements.md
    test.tsx
    component.tsx

  Card/
    requirements.md
    test.tsx
    component.tsx
```

---

## 8.6  Application Pages Folder

> **Deprecated.** This section describes the old `app/` page and feature folder conventions.  Pages and feature modules now live directly under `frontend/src/[module]/` (see §12.7).  The shell files live in `frontend/src/shell/` (see §4.4c of `04-Architectural-Boundaries.md`).  Use §12.7 as the authoritative reference.

```
app/
  pages/
    auth/
      auth.requirements.md
      auth.test.tsx
      LoginPage.jsx           ← Route target for /login
      components/
        LoginForm/
          requirements.md
          test.tsx
          component.tsx

    home/
      home.requirements.md
      home.test.tsx
      index.jsx               ← Route target for /app-home
      HomeDashboard.jsx       ← Assembles all widgets
      HomeWidgets/
        KpiWidget.jsx
        GwpChartWidget.jsx
        CumulativeGwpWidget.jsx
        RecentActivityWidget.jsx
        TasksWidget.jsx
        NotificationsWidget.jsx
        QuickActionsWidget.jsx

    submissions/
      index.jsx
      [id].jsx

    quotes/
      [id].jsx
      [id]/sections/[sectionId].jsx
      [id]/sections/[sectionId]/coverages/[coverageId].jsx

    policies/
      [id].jsx
      [id]/sections/[sectionId].jsx
      [id]/endorse.jsx

    binding-authorities/
      [id].jsx
      [id]/sections/[sectionId].jsx
      [id]/documents.jsx

    claims/
      create.jsx
      [id].jsx

    parties/
      search.jsx
      create.jsx
      [id].jsx

    finance/
      index.jsx
      cash-batching.jsx
      trial-balance.jsx
      payments.jsx

    reports/
      index.jsx
      create.jsx
      [reportId].jsx

    dashboards/
      create.jsx
      [id].jsx
      [id]/configure.jsx

    settings/
      index.jsx
      products.jsx
      products/[id].jsx
      rating-rules.jsx
      data-quality.jsx
      account.jsx
      organisations.jsx
      organisations/[id].jsx

    workflow/
      index.jsx
      submissions.jsx
      clearance.jsx
      data-quality.jsx

    search/
      index.jsx

    my-work-items/
      index.jsx

    profile/
      index.jsx

  features/
    workspace-tabs/
      workspace-tabs.requirements.md
      workspace-tabs.test.ts
      workspace-tabs.ts
      components/
        TabBar/
          requirements.md
          test.tsx
          component.tsx

    chat-dock/
      chat-dock.requirements.md   ← Requirements to be agreed before any code
      chat-dock.test.ts
      chat-dock.ts
      components/
        ChatDockPanel/
          requirements.md
          test.tsx
          component.tsx

  layouts/
    AppLayout/
      AppLayout.jsx
      Sidebar.jsx
      Navbar.jsx
    PublicLayout/
      PublicLayout.jsx

  shell/
    App.jsx
    RequireAuth.jsx
    Router.jsx
```

---

## 8.7  Backend Folder

> **Phase 1 migration in progress.** The NestJS app lives in `backend/nest/` (target architecture).  
> The Express files (`server.js`, `routes/`, `middleware/`) are legacy and coexist until NestJS cutover is verified.  
> See `Technical Documentation/13-Three-App-Migration-Plan.md` for cutover status.

```
backend/
  nest/                        ← NestJS application (target — see §12.6)
  server.js                    ← Express entry point (legacy — delete at cutover)
  db.js                        ← pg pool utility (legacy — replaced by DatabaseService)
  routes/                      ← Express route files (legacy)
  middleware/                  ← Express middleware (legacy — replaced by NestJS guards)
  __tests__/                   ← Layer 2 integration tests (schema-validation, api-smoke, requirements/)
```

---

## 12.6  NestJS Backend Module Layout

The NestJS application lives in `backend/nest/`.  Every domain maps to one module.

```
backend/nest/
  nest-cli.json
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    main.ts                    ← Bootstrap: loads .env.local, sets global prefix /api, CORS, port 5000
    app.module.ts              ← Root module — imports all feature modules
    health.controller.ts       ← GET /api/health
    database/
      database.module.ts
      database.service.ts      ← runQuery<T>(), runCommand<T>(), getPool() — replaces db.js
    auth/
      auth.module.ts
      auth.controller.ts       ← POST /api/auth/login, GET /api/auth/me, POST /api/auth/refresh
      auth.service.ts          ← login lockout, bcrypt verify, JWT sign
      jwt-auth.guard.ts        ← replaces authenticateToken middleware
      jwt.strategy.ts
      roles.guard.ts           ← replaces requireRole() middleware
      roles.decorator.ts       ← @Roles() custom decorator
    submissions/
      submissions.module.ts
      submissions.controller.ts
      submissions.service.ts
    quotes/
      quotes.module.ts
      quotes.controller.ts
      quotes.service.ts
    parties/
      parties.module.ts
      parties.controller.ts
      parties.service.ts
    audit/
      audit.module.ts
      audit.controller.ts
      audit.service.ts
    search/
      search.module.ts
      search.controller.ts
      search.service.ts
    dashboard/
      dashboard.module.ts
      dashboard.controller.ts
      dashboard.service.ts
  dist/                        ← Compiled output (git-ignored)
```

**Rules for adding a new module:**

1. Create three files: `[module].module.ts`, `[module].controller.ts`, `[module].service.ts`
2. Import `DatabaseModule` in the module imports array
3. Register the new module in `app.module.ts` imports array
4. Decorate the controller class with `@UseGuards(JwtAuthGuard)`
5. Put all SQL and business logic in the service — keep the controller thin

---

## 8.8  Documentation Folder

```
AI Guidelines/
  01-AI-Behaviour-Rules.md
  02-Checkpoints-and-Open-Questions.md
  03-Three-Artifact-Rule.md
  04-Architectural-Boundaries.md
  05-Multi-Tenant-Rules.md
  06-Testing-Standards.md
  07-Brand-Colour-Standards.md
  08-Event-Driven-Communication.md

Project Documentation/
  01-Architectural-Overview.md
  02-Domain-Definitions.md
  03-Workflow-Definitions.md
  04-Shared-Service-Definitions.md
  05-Reusable-UI-Primitive-Catalogue.md
  06-Multi-Tenant-Rules.md
  07-Event-Driven-Communication-Rules.md
  08-Folder-Structure.md  ← this file

Technical Documentation/
  01-Migration-Notes.md
  02-Legacy-to-New-Mapping.md
  03-Homepage-Rebuild-Plan.md
  04-Domain-Specific-Notes.md
  05-Workflow-Specific-Notes.md
  06-Shared-Service-Integration-Notes.md
  07-Component-Refactor-Notes.md
  08-Open-Questions.md
  09-Risk-Register.md
  10-Step-by-Step-Migration-Plan.md
```

---

## 8.9  Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Domain folder | kebab-case | `binding-authorities` |
| Domain logic file | `[domain].ts` | `submissions.ts` |
| Domain test file | `[domain].test.ts` | `submissions.test.ts` |
| Domain requirements | `[domain].requirements.md` | `submissions.requirements.md` |
| Workflow folder | kebab-case | `broker-led-submission` |
| Workflow files | `workflow.*` | `workflow.ts`, `workflow.test.ts` |
| Shared service folder | kebab-case | `event-bus` |
| Component folder | PascalCase | `SectionGrid` |
| Component file | `component.tsx` | `component.tsx` |
| Page file | `index.jsx` or descriptive | `HomeDashboard.jsx` |

---

## 12.7  Module / Controller / Service Pattern

> **Status:** This is the target architecture for `frontend/src/`, `backend/src/`, and `website/src/`.  Frontend migration is in progress.  Backend and website migrations follow after frontend is verified.

### What is a module?

A **module** is a cohesive unit of the application with a single, named area of responsibility.  There are two types — both are implemented identically:

| Type | Examples | Description |
|---|---|---|
| **Business domain module** | `submissions`, `quotes`, `parties`, `binding-authorities`, `policies`, `finance`, `reporting`, `settings`, `auth` | Owns a bounded set of business data and operations — maps directly to a DDD domain concept |
| **Feature module** | `home`, `search`, `workflow`, `profile`, `pwa`, `shell` | Owns an application-level capability that is not a business domain but still has its own service logic, pages, and tests |

In `frontend/src/`, both types live in a **single flat list** — there is no `domains/` sub-folder vs `features/` sub-folder distinction.  The domain names (`submissions`, `quotes`, `binding-authorities`, etc.) are preserved as folder names and remain fully visible at the top level of `src/`.

```
frontend/src/
  submissions/           ← business domain module
  quotes/                ← business domain module
  binding-authorities/   ← business domain module
  parties/               ← business domain module
  policies/              ← business domain module
  finance/               ← business domain module
  reporting/             ← business domain module
  settings/              ← business domain module
  auth/                  ← business domain module
  home/                  ← feature module
  search/                ← feature module
  workflow/              ← feature module
  profile/               ← feature module
  shell/                 ← feature module (AppLayout, Sidebar, routing)
  shared/                ← not a module — shared primitives (see §12.7d)
```

A module:
- Has its own named folder under `frontend/src/`
- Owns exactly one service (business logic and API calls), one or more controllers (page/route components), its own requirements file, and its own tests
- Exposes a named public contract via `[name].module.ts` — other modules may only import from that file
- Does not reach into the internals of another module

All code in `frontend/src/`, `backend/src/`, and `website/src/` is organised into **modules**.  Every module owns three responsibilities:

| Role | File pattern | Responsibility |
|---|---|---|
| **Module** | `[domain].module.ts` | Named exports only — declares what the module exposes to the rest of the app |
| **Controller** | `[PageName].tsx` (frontend) / `[domain].controller.ts` (backend) | Routing and orchestration — no business logic |
| **Service** | `[domain].service.ts` | Business logic, API calls, data transforms |

### Module folder layout

Each module is a self-contained folder. Requirements and test files live **inside** the module:

```
frontend/src/submissions/
  submissions.module.ts          ← named exports only (see §12.7a)
  SubmissionsPage.tsx            ← controller: route target, layout composition
  SubmissionsCreatePage.tsx      ← controller: create form route target
  submissions.service.ts         ← service: API calls, transforms, validation
  submissions.requirements.md    ← requirements live in the module
  __tests__/
    SubmissionsPage.test.tsx     ← tests live in the module
    submissions.service.test.ts
```

### §12.7a — No Barrel Files

Barrel files (`index.ts` containing `export * from './file'`) are **forbidden**.  Every import must name the source file directly.

```
❌  // index.ts
    export * from './SubmissionsPage'
    export * from './submissions.service'

❌  import { SubmissionsPage } from '@/submissions'           // imports from an index barrel

✅  import SubmissionsPage from '@/submissions/SubmissionsPage'
✅  import { listSubmissions } from '@/submissions/submissions.service'
```

The module file (`submissions.module.ts`) is **not** a barrel — it is an explicit contract that lists only what other modules are allowed to import:

```typescript
// submissions.module.ts — explicit named exports, not a re-export star
export { SubmissionsPage } from './SubmissionsPage'
export type { Submission, SubmissionStatus } from './submissions.service'
// Internal helpers (service functions, sub-components) are NOT exported
```

### §12.7b — Controller rules (frontend)

A controller is the route-target page component.  It:
- Owns the route path
- Composes layout and sub-components
- Calls the service for data
- Does **not** contain raw SQL, complex transforms, or API fetch logic

```tsx
// SubmissionsPage.tsx — controller
import { listSubmissions } from './submissions.service'

export default function SubmissionsPage() {
  // orchestrates: layout + calls service
}
```

### §12.7c — Service rules

A service contains all business logic.  It:
- Makes all `api-client` / `fetch` calls
- Runs data transforms and validation
- Is framework-agnostic (no JSX, no React hooks)
- Is the only place allowed to know about API endpoint paths

```typescript
// submissions.service.ts — service
import { apiClient } from '@/shared/lib/api-client/api-client'

export async function listSubmissions(filters: SubmissionFilters): Promise<Submission[]> {
  return apiClient.get('/submissions', { params: filters })
}
```

### §12.7d — Shared code location

Shared code that is not domain-specific lives in `frontend/src/shared/`:

```
frontend/src/shared/
  components/          ← migrated from frontend/components/
    Card/
      component.tsx
      requirements.md
      __tests__/
        test.tsx
  lib/                 ← migrated from frontend/lib/
    api-client/
    auth-session/
    formatters/
    ...
```

# AI GUIDELINES — SECTION 4: ARCHITECTURAL BOUNDARIES

This document defines the non-negotiable structural rules that every domain, workflow, shared service, and component must follow.  The AI must enforce these rules at all times.

---

## 4.1  Why Boundaries Exist

Without boundaries:
- Domain logic leaks into components
- Workflows accumulate business rules they should not own
- Shared services become coupled to specific domains
- Cross-domain changes cause unexpected failures
- The system becomes progressively harder to understand and change

Boundaries are the primary tool for keeping the architecture stable as the system grows.

---

## 4.2  Domain Rules

A domain is a vertical slice of the system that owns a specific area of business logic.

### Domain Boundaries

| Rule | Description |
|------|-------------|
| **No cross-domain imports** | A domain file must never import from another domain. |
| **No leaking logic** | Business rules stay inside the domain.  No logic bleeds into workflows or components. |
| **Clear public interface** | The domain exposes a public API (functions, events, types).  Callers use the interface, not internals. |
| **Stable regardless of workflow changes** | The domain does not know which workflow is using it. |
| **Single owner** | Each piece of business logic belongs to exactly one domain. |

### Domain Folder Structure

```
frontend/src/[domain-name]/
  [domain].requirements.md   ← agreed spec
  [domain].service.ts        ← domain business logic and API calls
  [domain].module.ts         ← named public exports (see §12.7a)
  [PageName].tsx             ← route-target page component(s)
  __tests__/
    [domain].service.test.ts ← domain logic unit tests
    [PageName].test.tsx      ← component behaviour tests
```

### Domain List (Initial)

| Domain | Owns |
|--------|------|
| `submissions` | Submission lifecycle, workflow status, AI extraction results.  Clearance is a sub-workflow, not a separate domain. |
| `quotes` | Quote structure, sections, coverages, deductions, pricing.  Quote issuance triggers invoice creation via the `invoices` shared module. |
| `policies` | Policy binding, movements, audit trail.  Endorsement issuance triggers invoice creation via the `invoices` shared module. |
| `binding-authorities` | BA contracts, sections, transactions, outbound bordereaux. `bordereau-import` (inbound file import → policy records) is a sub-feature within this domain — independently licensable via `module:bordereau-import` but **not** a separate domain folder. |
| `claims` | Claim records, transactions, reserves, financials |
| `parties` | Organisations, brokers, insureds, coverholders, insurers |
| `finance` | Cash allocation, aged debt monitoring, trial balance, payment processing.  Finance consumes invoices from the `invoices` shared module; it does not create them. |
| `reporting` | Custom reports, dashboards, widgets |
| `settings` | Rating rules, products, field metadata, org config. Has two admin layers: tenant admin (visible to `org_admin`) and platform admin (visible to `pf_admin` only — org module assignments, org hierarchy, cross-tenant config). |
| `auth` | Login, logout, session management, token handling |

---

## 4.2a  Backend Module Structure (NestJS)

The backend is a NestJS application in `backend/nest/`.  Each domain maps to one NestJS module.  The module graph is declared in `app.module.ts`.

### Module Pattern

Every backend feature is a module consisting of exactly three files:

```
backend/nest/src/[module-name]/
  [module].module.ts      ← declares providers, controllers, imports
  [module].controller.ts  ← thin HTTP layer: extract params, call service
  [module].service.ts     ← all business logic, SQL queries, validation
```

### Backend Module Boundary Rules

| Rule | Description |
|------|-------------|
| **Controllers are thin** | Controllers extract request parameters and call one service method. No SQL, no business rules, no direct DB access in controllers. |
| **Services own all logic** | All database queries, data validation, status transition rules, reference generation, and org-scoping live in the service. |
| **DatabaseService via DI** | All database access uses the injected `DatabaseService` (`runQuery`, `runCommand`). No direct `pg` Pool in controllers or services. |
| **Auth via guards** | Every controller is decorated `@UseGuards(JwtAuthGuard)` at the class level. Role restrictions add `@Roles('role_name')` + `@UseGuards(RolesGuard)`. |
| **Multi-tenant scoping** | `orgCode` always comes from `req.user.orgCode` (validated JWT payload). Never read `orgCode` from `@Body()` or `@Query()`. |
| **No cross-module service injection** | A module's service must not inject another module's service. Cross-cutting concerns (e.g. audit events) are handled by the calling service directly, not by importing the Audit service. |
| **Errors via NestJS exceptions** | Throw `NotFoundException`, `ForbiddenException`, `BadRequestException` etc. — never return raw `res.json({ error })` from services. Controllers do not catch exceptions from services; NestJS's exception filter handles them. |

### Backend Module List

| Module | File | Endpoints |
|--------|------|-----------|
| `AuthModule` | `src/auth/` | POST /auth/login, GET /auth/me, POST /auth/refresh |
| `SubmissionsModule` | `src/submissions/` | 6 endpoints — full CRUD + submit + decline |
| `QuotesModule` | `src/quotes/` | 7 endpoints — full CRUD + /quote + /bind + /decline |
| `PartiesModule` | `src/parties/` | 2 endpoints — GET list + POST create |
| `AuditModule` | `src/audit/` | POST /event + GET /:type/:id |
| `SearchModule` | `src/search/` | GET / (defaultMode + filterMode) |
| `DashboardModule` | `src/dashboard/` | 9 stub + real recent-records-data endpoints |
| `DatabaseModule` | `src/database/` | Shared — provides `DatabaseService` to all modules |

---

## 4.3  Workflow Rules

A workflow orchestrates behaviour across domains.  It does not own domain logic.

### Workflow Boundaries

| Rule | Description |
|------|-------------|
| **Orchestration only** | Workflows coordinate domains.  They do not implement domain logic. |
| **Event-driven transitions** | State transitions happen via events, not direct function calls between domains. |
| **No domain logic inside workflows** | If a workflow contains business rules, those rules are in the wrong place. |
| **No cross-workflow imports** | Workflows do not import from each other. |

### Workflow Folder Structure

```
workflows/[workflow-name]/
  workflow.requirements.md
  workflow.test.ts
  workflow.ts
```

### Workflow List (Initial)

| Workflow | Orchestrates |
|----------|-------------|
| `broker-led-submission` | AI email intake → submission creation → assignment → quoting |
| `manual-submission` | Manual data entry → submission creation → assignment → quoting |
| `clearance-checking` | Duplicate detection across submissions, quotes, policies |
| `quote-to-policy` | Quote acceptance → policy binding → invoice generation |
| `policy-endorsement` | Mid-term change → endorsement creation → movement recording |
| `binding-authority-reporting` | Transaction capture → bordereaux generation |
| `claim-lifecycle` | Claim creation → reserve setting → payment → settlement |

---

## 4.4  Shared Service Rules

Shared services provide capabilities used across domains and workflows.  They are domain-agnostic.

### Shared Service Boundaries

| Rule | Description |
|------|-------------|
| **Domain-agnostic** | A shared service must never import from any domain. |
| **Stable interface** | The interface does not change when domain rules change. |
| **Multi-tenant aware** | Every shared service must accept tenant context (org code) at runtime. |
| **No domain imports** | Shared services receive data as parameters.  They do not fetch domain data themselves. |
| **Configuration-driven** | Behaviour is controlled by configuration passed at runtime, not hardcoded. |
| **No React / JSX / CSS** | `shared/lib/` services are framework-agnostic TypeScript only.  They must run in Node test environments without a browser. |

### Shared Service Folder Structure

```
frontend/src/shared/lib/[service-name]/
  [service].requirements.md
  [service].test.ts
  [service].ts
```

### Shared Service List (Initial)

| Service | Provides |
|---------|---------|
| `permissions` | Role-based and tenant-based access control decisions |
| `event-bus` | Cross-domain event publication and subscription |
| `notifications` | User notification creation, delivery, and status |
| `audit` | Immutable change records for any entity |
| `auth-session` | Token validation, session management |
| `api-client` | Standardised HTTP fetch wrapper |
| `formatters` | Currency, date, text formatting |
| `lookups` | Reference data (countries, risk codes, SIC codes) |
| `pdf-generator` | Document generation from templates |
| `email-scheduler` | Scheduled email sending |

> **Note:** Shared services live in `frontend/src/shared/lib/` (e.g. `frontend/src/shared/lib/api-client/`).  Import paths use `@/shared/lib/[service-name]`.

---

## 4.4a  Shared Module Rules

Shared modules are cross-domain business concepts that have their own data model and UI components but are not owned by any single domain.  They are different from shared services: shared services provide domain-agnostic utilities; shared modules carry business-relevant data that multiple domains reference.

### Shared Module Boundaries

| Rule | Description |
|------|-------------|
| **No domain ownership** | A shared module is not part of any domain.  No domain is its "parent". |
| **No domain imports** | A shared module must never import from any domain. |
| **Read by many, written by events** | Domains trigger shared module creation by publishing events.  The module listens and persists its data. |
| **Identical representation** | If the same concept (e.g. location, invoice) would be displayed or validated differently in each domain, it is not a shared module — reconsider the design. |
| **Own folder in sharedmodules/** | Each shared module has its own folder with the three-artifact pattern: requirements, tests, implementation. |

### Shared Module Folder Structure

> **Note (planned):** Shared modules (business concepts used across domains) are not yet implemented in the current architecture.  When implemented, they will follow the same module pattern as domain folders under `frontend/src/` (see §12.7 of `12-Folder-Structure.md`).  They are distinct from `frontend/src/shared/lib/` services (pure utilities with no business logic).

### Shared Module List (Initial)

| Module | Used by | Description |
|--------|---------|-------------|
| `invoices` | quotes, policies (endorsements), finance | Created when a quote or endorsement is issued.  Consumed by finance for cash allocation and aged debt monitoring. |
| `locations` | submissions, quotes, policies, binding-authorities | Geographic risk locations attached to any insurance record type.  Identical data model and entry form regardless of which record type carries them. |

---

## 4.4b  App Feature Rules

App features are application-level capabilities that support the user but are not part of any core business workflow and are not owned by any domain.

### App Feature Boundaries

| Rule | Description |
|------|-------------|
| **Not a domain** | App features do not own business objects or implement domain rules. |
| **May use shared services** | App features may call shared services (e.g. `api-client`, `auth-session`, `notifications`). |
| **May not import from domains** | App features do not depend on domain logic. |
| **Mounted in the app shell** | App features render inside the app layout, not inside domain pages. |
| **Scoped to tenant** | App features that involve data (e.g. chat messages) must be scoped to `org_code`. |

### App Feature Folder Structure

```
frontend/src/[feature-name]/
  [feature].requirements.md
  [feature].service.ts
  [feature].module.ts
  [PageName].tsx
  __tests__/
    [PageName].test.tsx
```

### App Feature List (Initial)

| Feature | Description |
|---------|-------------|
| `workspace-tabs` | Allows users to hold multiple open records in named tabs within a session. |
| `chat-dock` | Internal team messaging — allows users within the same organisation to send messages to each other in real time.  Scoped to `org_code`.  Future consideration: Microsoft Teams integration so messages can be surfaced or actioned from within Teams.  Requirements to be agreed before implementation begins. |

---

## 4.4c  App Shell Rules

The app shell is the persistent authenticated frame that wraps all page content.  It owns navigation, layout, and cross-cutting app-level features (sidebar, notification dock, error boundary).  It is neither a reusable shared component primitive nor a domain module vertical slice.

### App Shell Boundaries

| Rule | Description |
|------|-------------|
| **Owns navigation only** | The app shell renders routing structure, the sidebar, the notification dock, and the error boundary.  It does not own business objects. |
| **No domain imports** | App shell files must never import from domain modules or workflow modules in `frontend/src/`. |
| **May use shared services** | App shell files may import from `frontend/src/shared/lib/` (e.g. `auth-session`, `api-client`, `notifications`). |
| **Sub-components covered by parent requirements** | Small sub-components that exist solely to support the shell (e.g. `LogoutButton`, `SidebarContext`) do not need their own `requirements.md`.  They must be referenced in the parent shell component's requirements file. |

### App Shell Folder Structure

```
frontend/src/shell/
  shell.requirements.md       ← covers AppLayout, Sidebar, NotificationDock + sub-components
  AppLayout.tsx
  Sidebar.tsx
  SidebarContext.tsx
  NotificationDock.tsx
  NotificationDock.test.tsx
  LogoutButton.tsx            ← covered by auth.requirements.md
```

> **Note:** The app shell (`frontend/src/shell/`) is the only permitted location for files that are part of the authenticated frame but are not standalone reusable primitives and are not domain module logic.  Do not place shell files inside `frontend/src/shared/components/`.

---

## 4.5  Reusable UI Component Rules

UI components are domain-agnostic building blocks.  They render structure and interactions.  They do not contain domain logic.

### Component Boundaries

| Rule | Description |
|------|-------------|
| **Domain-agnostic** | A component must never import from any domain. |
| **Configuration-driven** | Behaviour is controlled by props, not internal state or hardcoded rules. |
| **Composable** | Components should be buildable into larger patterns without modification. |
| **No embedded domain logic** | Business rules passed as props — never hardcoded inside the component. |

### Component Folder Structure

```
frontend/src/shared/components/[ComponentName]/
  requirements.md
  __tests__/
    test.tsx
  [ComponentName].tsx
```

---

## 4.6  Event-Driven Communication Rules

Cross-domain communication happens through events only.  There are no direct calls from one domain to another.

### Event Rules

| Rule | Description |
|------|-------------|
| **No direct cross-domain calls** | Domain A never calls Domain B directly. |
| **Events as the integration mechanism** | Domain A publishes an event.  Domain B subscribes. |
| **No circular dependencies** | Event subscriptions must not create circular chains. |
| **Events are named clearly** | Event names describe what happened: `submission.created`, `quote.accepted`, `policy.bound`. |

### Event Naming Convention

```
[domain].[action]

Examples:
  submission.created
  submission.assigned
  quote.accepted
  quote.declined
  policy.bound
  claim.opened
```

---

## 4.8  File Extension Rules

All React component files must use the `.tsx` extension.  All non-React TypeScript files must use `.ts`.  Plain `.js` and `.jsx` are not permitted in application source code.

### Extension Rules

| Rule | Description |
|------|-------------|
| **`.tsx` for React files** | Any file that contains JSX or imports React must have the `.tsx` extension. |
| **`.ts` for logic files** | Domain logic, services, hooks without JSX, and test helpers must use `.ts`. |
| **No `.jsx` in source** | `.jsx` files are not permitted.  The sole exception is `frontend/src/main.jsx` (the Vite entry point — a structural exception, not a template to follow). |
| **No `.js` in frontend source** | Plain JavaScript files are not permitted in `frontend/src/`, with two permitted exceptions: (1) workspace-root and sub-project config files (e.g. `vite.config.js`, `jest.config.js`); (2) `frontend/src/__tests__/*.test.js` — the codebase scan uses CommonJS `require()` for file-system reads, which is incompatible with ts-jest ESM mode.  All other files in `frontend/src/__tests__/` must be `.ts` or `.tsx`. |
| **TypeScript types replace JSDoc** | When converting `.jsx` to `.tsx`, replace `@typedef` JSDoc blocks with TypeScript `interface` or `type` declarations.  JSDoc comments for function descriptions are still welcome. |

### Rationale

TypeScript's static analysis only applies when files use `.ts` or `.tsx`.  Files saved as `.jsx` are processed by Vite but are not type-checked, defeating the `strict: true` tsconfig setting.  Enforcing `.tsx` ensures the entire React layer benefits from compile-time safety.

### Enforcement

RULE-10 in `frontend/src/__tests__/codebase-scan.test.js` scans `frontend/src/` for any `.jsx` files and fails the build if any are found outside the single permitted exception (`frontend/src/main.jsx`).

---

## 4.9  Backend-First Business Logic

The frontend is always visible to users in browser DevTools.  Business logic that lives
in the frontend can be read, copied, and replicated by anyone with access to the running
application.  All substantive business rules must live exclusively in the backend.

### Rules

| Rule | Description |
|---|---|
| **Reference / ID generation is server-side** | Sequence numbers, submission references, invoice numbers, and any auto-generated identifiers must be generated by the backend (database sequence or `SELECT … FOR UPDATE`).  Clients must never pre-compute these values — parallel requests from different users will produce collisions. |
| **Business calculations are server-side** | Pricing, rating, premium computation, fee calculations, and discount application must be implemented in backend route handlers.  The frontend sends inputs and receives the computed result — it does not perform the calculation. |
| **Eligibility / underwriting rules are server-side** | Accept/decline decisions, coverage eligibility checks, and risk appetite rules must be enforced by the backend.  The frontend may display the outcome but must not contain the decisioning logic. |
| **Role enforcement is server-side** | Every API endpoint must verify the caller's role from the JWT before performing any restricted action.  Frontend permission checks (e.g. `lib/permissions/isActionEnabled()`) are UX hints only — they improve the user experience but are never the sole access gate.  A user who forges or modifies their token must still be blocked at the API level. |
| **Module dependency rules are server-side** | Rules such as "Bordereau Import requires Binding Authorities" must be enforced in the backend route that writes module configuration.  Frontend cascade logic is supplementary UX — not authoritative. |
| **Default term rules are server-side** | Business defaults (e.g. "policy term defaults to 1 year") must be applied by the backend on record creation.  The frontend may pre-populate a form field as a convenience, but the backend must apply the rule regardless of what the client sends. |

### What the frontend is permitted to contain

| Permitted | Not permitted |
|---|---|
| Display formatting (currency, dates, labels) | Pricing or rating calculations |
| Form field validation (required, format, length) | Eligibility or underwriting decisions |
| UX-layer permission checks (show/hide buttons) | Sole enforcement of role-based access |
| Pre-populated form defaults (convenience only) | Authoritative business defaults |
| Module dependency cascade in UI state | Authoritative module dependency enforcement |

### Why this matters

1. **Security:** Minified JavaScript is still readable by a determined user.  Backend business rules are never shipped to the browser.
2. **Correctness:** Frontend logic runs independently in each browser tab.  Concurrent users running the same sequence generator or calculation will produce collisions.  The backend serialises writes.
3. **Auditability:** Backend logic runs in a controlled, loggable environment.  Frontend logic runs in an environment the operator does not control or monitor.

---

## 4.7  Violation Reporting

When the AI detects a boundary violation, it must:

1. Name the violation explicitly
2. Identify which file and which import causes it
3. Explain the rule that is broken
4. Propose a corrected approach using events or shared services
5. Log it as an open question if it cannot be resolved immediately

The AI must never silently allow a boundary violation to pass.

---

## 4.9  Database Layer Rules

The database schema is a separate architectural component from the application code.  It lives in `db/` at the project root and is owned independently of `backend/` and `app/`.

### Why it is separate

- A schema change (adding a column, creating a table) must be reviewable and deployable without touching API or UI code
- Multiple developers can work on schema and application code simultaneously without conflicts
- A second developer or DBA can be given access to `db/` alone without needing to understand the application layer

### db/ Folder Structure

```
db/
  migrations/     ← numbered, ordered schema change scripts
    001-[description].js
    002-[description].js
    ...
  seeds/          ← reference data and test data scripts
    001-[description].js
    ...
  README.md       ← how to run migrations; rules for adding new ones
```

### db/ Boundary Rules

| Rule | Description |
|------|-------------|
| **Schema lives in `db/` only** | No `CREATE TABLE`, `ALTER TABLE`, or `DROP TABLE` statements anywhere in `backend/` or `frontend/src/`. |
| **Migrations are numbered** | Each file is prefixed `NNN-` and run in numeric order.  Never rename a migration after it has been run against any database. |
| **Migrations are idempotent** | Every migration must be safe to re-run (`CREATE TABLE IF NOT EXISTS`, `IF NOT EXISTS` index checks, conditional `ALTER TABLE` blocks). |
| **One concern per migration** | A migration file creates or modifies one table or one group of tightly related columns.  Do not bundle unrelated schema changes. |
| **No application logic in migrations** | Migrations may read environment variables and connect to Postgres.  They must not import from `backend/routes/` or `frontend/src/`. |
| **Seeds are separate from migrations** | Reference data (lookup tables, default admin user) goes in `db/seeds/`, not embedded inside migration files, except for the initial admin bootstrap which may remain in `001-create-users-table.js`. |
| **`backend/db.js` is not a migration** | `backend/db.js` is the connection pool module used at runtime by the API.  It belongs in `backend/` because it is consumed by routes.  It must never contain `CREATE TABLE` statements. |

### npm Scripts

| Script | Command |
|--------|---------|
| `npm run db:migrate` | Runs all migration files in order |
| `npm run db:seed` | *(to be added)* Runs all seed files in order |

### Adding a new migration

1. Create `db/migrations/NNN-describe-the-change.js` (next number in sequence)
2. Follow the pattern of existing files: dotenv load, Pool, idempotent SQL, log output, error exit
3. Add it to the `db:migrate` script in `package.json` (append with `&&`)
4. Write the requirements for the schema change before writing the migration
5. One migration per PR — do not bundle schema changes with feature code

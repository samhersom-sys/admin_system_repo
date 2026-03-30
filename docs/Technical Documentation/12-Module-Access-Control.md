# TECHNICAL DOCUMENTATION — 12: Module Access Control

**Status:** Architecture locked — ready for implementation  
**Raised:** 2026-03-12  
**Updated:** 2026-03-12 (all open questions answered)  
**Owner:** Architecture

---

## 1. Problem Statement

PolicyForge is a platform sold to multiple tenants (insurance organisations).  Not every tenant needs or purchases every domain.  A company that manages claims on imported bordereaux does not need the full submission→quote→policy workflow.  A company that only runs binding authorities does not need standalone submissions.

Currently there is no mechanism to:
- Control which modules a tenant has licensed
- Hide unlicensed nav items from the sidebar
- Block unlicensed API routes at the server layer
- Allow PolicyForge internal admins to set per-tenant access without a code deployment

---

## 2. Proposed Concept: Module Licensing

A **module** is a named, licensable unit of functionality.  It maps directly to one or more domains/workflows.  The policy-forge-admin (a PolicyForge internal administrator) assigns a set of licensed modules to each tenant organisation.

The licensed module set is:
- **Stored in the database** — per org, not per user
- **Delivered to the client** at login only (not on every page load)
- **Enforced on the server** — unlicensed API routes return `403 Module not licensed`
- **Enforced on the client** — nav items and create-menu items are hidden; direct URL access redirects to `/app-home`

---

## 3. Proposed Module Keys

| Module Key | What it unlocks |
|------------|-----------------|
| `module:submission-workflow` | Full submission → quote → policy → endorse → renew pipeline |
| `module:bordereau-import` | Standalone bordereau import that creates policy records without the full workflow |
| `module:binding-authorities` | Binding authority contracts, sections, transactions |
| `module:claims` | Claims management (create, reserve, pay, settle) |
| `module:finance` | Cash allocation, aged debt, payments, trial balance |
| `module:reporting` | Dashboards, widgets, custom reports |
| `module:parties` | Party management (organisations, brokers, insureds) |
| `module:search` | Cross-record search |
| `module:settings` | Org-level configuration, rating rules, products |

> **Baseline:** `module:parties`, `module:search`, and `module:settings` are likely always included. Exact baseline TBD (see OQ-016).

### Example org configurations

| Tenant type | Licensed modules |
|-------------|-----------------|
| Full Lloyd's broker | All modules |
| Bordereaux-only coverholder | `module:bordereau-import`, `module:claims`, `module:parties`, `module:search`, `module:settings` |
| Claims-only TPA | `module:claims`, `module:parties`, `module:search`, `module:settings` |
| BA market | `module:binding-authorities`, `module:claims`, `module:finance`, `module:reporting`, `module:parties`, `module:search`, `module:settings` |

---

## 4. Architecture

### 4.1 Database

New table: `org_modules`

```sql
CREATE TABLE org_modules (
  id           SERIAL PRIMARY KEY,
  org_code     TEXT NOT NULL,
  module_key   TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled_by   INTEGER REFERENCES users(id),   -- PolicyForge admin user id
  disabled_at  TIMESTAMPTZ,
  disabled_by  INTEGER REFERENCES users(id),
  UNIQUE(org_code, module_key)
);
```

The table is editable only by PolicyForge internal admins (role = `internal_admin`). No tenant user has write access to this table.

### 4.2 Backend — delivering modules to the client

`GET /api/auth/me` (and `POST /api/auth/login` response) must include `enabledModules: string[]`.

```json
{
  "user": { "id": 1, "email": "...", "orgCode": "TST", "role": "underwriter" },
  "enabledModules": ["module:submission-workflow", "module:claims", "parties", "search", "settings"]
}
```

The backend joins `users` with `org_modules` at login time, then resolves infrastructure dependencies. Module changes made by a `internal_admin` take effect on the user's **next login**.

### 4.3 Backend — API enforcement

New middleware: `requireModule(moduleKey: string)`

```js
// middleware/requireModule.js
function requireModule(moduleKey) {
  return (req, res, next) => {
    const modules = req.user?.enabledModules ?? []
    if (!modules.includes(moduleKey)) {
      return res.status(403).json({ error: 'Module not licensed for your organisation' })
    }
    next()
  }
}
```

Applied at the router level:
```js
app.use('/api/submissions', requireModule('module:submission-workflow'), require('./routes/submissions'))
app.use('/api/binding-authorities', requireModule('module:binding-authorities'), require('./routes/binding-authorities'))
```

> The `requireModule` check sits **after** `requireAuth` — a user must be authenticated before module access is evaluated.

### 4.4 Client — session storage

`lib/auth-session` `SessionUser` type gains `enabledModules: string[]`.

```ts
export interface SessionUser {
  id: number
  email: string
  name: string
  orgCode: string
  role: string
  enabledModules: string[]  // NEW
}
```

`storeSession()` persists the array. `getSession()` returns it. The array is set **at login only** and is not refreshed on subsequent page loads.

### 4.5 Client — sidebar filtering

`Sidebar.tsx` reads `enabledModules` from `getSession()` and filters `NAV_ITEMS` and `CREATE_ITEMS`:

```ts
const MODULE_FOR_NAV: Record<string, string> = {
  '/submissions':          'module:submission-workflow',
  '/quotes':               'module:submission-workflow',
  '/policies':             'module:submission-workflow',
  '/binding-authorities':  'module:binding-authorities',
  '/claims':               'module:claims',
  '/finance':              'module:finance',
  '/reports':              'module:reporting',
  // parties, search, settings have no module key — always present via infrastructure dependency
}
```

Items with no entry in `MODULE_FOR_NAV` (Home, Parties, Search, Settings) are always shown. Items whose module key is absent from `enabledModules` are **completely hidden** — no greyed-out state, no tooltip.

### 4.6 Client — route-level guard

A `<ModuleGuard module="module:submission-workflow">` component wraps domain routes in the router. If the module is not licensed, it **redirects to `/app-home`** — no error page, no message. The user simply cannot reach a page they have no nav entry for.

---

## 5. Bordereau Import — Sub-feature of Binding Authorities

`bordereau-import` is a **sub-feature within the `binding-authorities` domain**, not a separate domain folder. An org can license `module:binding-authorities` without licensing `module:bordereau-import`. The reverse is not permitted (OQ-037).

The inbound import workflow (file → parse → validate → create policy records against a BA contract) lives inside `domains/binding-authorities/` as a feature area. It shares the same domain module but has its own route, page component, and requirements file. It is guarded in the router by `<ModuleGuard module="module:bordereau-import">` so only orgs that have licensed the import add-on can access it.

The existing outbound bordereaux generation (transaction capture → bordereaux file) is a separate feature within the same domain and is included in the base `module:binding-authorities` licence.

---

## 6. Policy-Forge-Admin Interface

The admin interface uses **Option B: a `internal_admin` super-admin role within this app** (OQ-038). The `settings` domain has two layers:

| Layer | Visible to | Contains |
|-------|-----------|----------|
| Tenant admin settings | Users with `role: client_admin` | Rating rules, products, field metadata, user management for their org |
| Platform admin settings | Users with `role: internal_admin` only | Org module assignments, org hierarchy, cross-tenant configuration |

The platform admin sub-section within settings needs to:
1. List all tenant organisations
2. For each org, show the licensed module set with toggle switches (on/off), with dependency validation
3. Save changes — writes to `org_modules` table
4. Show an audit log of who changed what and when
5. Manage org hierarchy (also present in the backup app)

> Routes under `/settings/admin/` are guarded by `role: internal_admin`. A tenant `client_admin` navigating to these routes gets a 403 at the API level and the routes are hidden from their sidebar.

---

## 7. Impact on Existing Architecture

| Area affected | Change required |
|--------------|-----------------|
| `db/migrations/` | Migration to create `org_modules` table |
| `backend/middleware/` | Add `requireModule.js` middleware |
| `backend/routes/auth.js` | Include `enabledModules` in login response and `/me` response |
| `lib/auth-session` | Add `enabledModules: string[]` to `SessionUser` type and storage |
| `app/AppLayout/Sidebar.tsx` | Filter `NAV_ITEMS` and `CREATE_ITEMS` by enabled modules |
| `app/router` | Wrap domain routes in `<ModuleGuard>` |
| `domains/binding-authorities/` | Add bordereau-import feature area (route, page, requirements) within existing domain |
| `documentation/AI Guidelines/05-Multi-Tenant-Rules.md` | Add §5.9 Module Licensing rules |
| `documentation/AI Guidelines/04-Architectural-Boundaries.md` | Add `bordereau-import` as sub-feature of `binding-authorities` domain (not a new domain folder) |

---

## 8. What Must NOT Change

- Module configuration is **per-org only** — never per-user. Individual user permissions within a licensed module are controlled by the `role` field.
- What a user can **do** within a module is controlled by role (e.g. a claims adjuster cannot create a quote or issue a policy). This is separate from module licensing.
- Module keys are **never hardcoded to org names**. This violates Guideline §5.6.
- The `requireModule` middleware must **always run after `requireAuth`** — module access is only meaningful for authenticated users.
- The `enabledModules` array is **read-only on the client**. Only `internal_admin` accounts can write to `org_modules`.
- Module changes take effect **on next login only**. No immediate invalidation of active sessions.
- Routes for unlicensed modules **redirect to `/app-home`** — no error page, no visible greyed-out state in the sidebar.

---

## 9. Open Questions

All open questions (OQ-033 through OQ-039) have been answered. No blockers remain for implementation.

---

## 10. Suggested Implementation Order

Once open questions are resolved:

1. DB migration — create `org_modules` table
2. Seed baseline modules for the existing test org
3. Backend `requireModule` middleware (unit-testable in isolation)
4. Update `POST /api/auth/login` and `GET /api/auth/me` to return `enabledModules`
5. Update `lib/auth-session` `SessionUser` type and storage
6. Update `Sidebar.tsx` to filter by `enabledModules`
7. Add `<ModuleGuard>` to router
8. Implement bordereau-import feature within `domains/binding-authorities/` (own route, page, requirements file)
9. Build `internal_admin` settings sub-section with module management UI (toggle per org, dependency validation, audit log)

# AI GUIDELINES — SECTION 5: MULTI-TENANT RULES

This document defines how Policy Forge handles multiple subscribing organisations (tenants) sharing the same platform.  Every domain, workflow, shared service, and component must respect these rules.

---

## 5.1  What Multi-Tenancy Means in Policy Forge

Policy Forge is a shared platform where multiple insurance organisations use the same application.  Each organisation is a **tenant**.  Tenants must:

- Only see their own data
- Only act within their own permissions
- Only trigger workflows they are authorised for
- Only access configuration that applies to their tenancy

Tenants must never be able to see, touch, or affect another tenant's data — even accidentally.

---

## 5.2  Current State (Legacy)

The legacy codebase stores `org_code` and `role` on every user record in the database.  However:

- No API route filters by `org_code`
- No middleware enforces tenant isolation
- No permission middleware protects endpoints
- All authenticated users currently have the same level of access

This means **multi-tenancy is a database schema intent, not an enforced behaviour**.  The new architecture must fix this.

---

## 5.3  Tenant Identity

Every request to the system must carry a tenant identity.  This is the `org_code` on the authenticated user.

| Field | Source | Description |
|-------|--------|-------------|
| `org_code` | JWT token / auth context | The organisation this user belongs to |
| `role` | JWT token / auth context | The user's role within that organisation |
| `user_id` | JWT token / auth context | The individual user |

The tenant context must be:
- Set at authentication time
- Passed through every API request
- Validated by every API route
- Available to every shared service at runtime

---

## 5.4  Tenant Scoping Rules

### Data Rules

| Rule | Description |
|------|-------------|
| **Every API query must filter by `org_code`** | No query may return data across tenant boundaries. |
| **Every write must scope to `org_code`** | Created or updated records must carry the tenant's `org_code`. |
| **No cross-tenant references** | A submission for Tenant A must never link to a party or quote for Tenant B. |

### Visibility Rules

| Rule | Description |
|------|-------------|
| **Users only see their tenant's records** | The UI must never display records belonging to another tenant. |
| **Configuration is tenant-specific** | Rating rules, products, and field metadata may differ per tenant. |
| **Dashboards and reports are tenant-scoped** | Report data must be filtered by the user's `org_code`. |

### Permission Rules

| Rule | Description |
|------|-------------|
| **Permissions are evaluated per-tenant** | Role `underwriter` at Tenant A may have different permissions to `underwriter` at Tenant B. |
| **Tenant administrators manage their own users** | A Tenant A admin cannot see or manage Tenant B users. |
| **PolicyForge internal admins have cross-tenant access** | Only explicitly designated platform admin accounts may view multiple tenants. |

### Workflow Rules

| Rule | Description |
|------|-------------|
| **Workflows are tenant-aware** | A workflow triggered for Tenant A must not affect Tenant B's data. |
| **Cross-tenant workflows require explicit governance** | Data sharing between tenants (e.g., referrals) must be explicitly authorised and audited. |

---

## 5.5  Multi-Tenant Account Hierarchy (Target)

```
PolicyForge Platform
│
├── Internal Admin Accounts (cross-tenant, platform-level access)
│
└── Tenant Organisations
    ├── Tenant Administrator (manages users and config for their org)
    ├── Underwriter
    ├── Broker
    ├── Claims Handler
    └── Finance
```

---

## 5.6  Configuration-Driven Behaviour

Different tenants may need different behaviours.  This must be achieved through configuration, not code branching.

**Allowed:**
```
if (tenant.config.requiresClearanceCheck) { ... }
```

**Not allowed:**
```
if (orgCode === 'AON') { ... }
```

Hardcoding tenant names or org codes into business logic is a violation.

---

## 5.7  AI Enforcement Rules

The AI must:

- Flag any API route that does not filter by `org_code`
- Flag any query that could return cross-tenant data
- Flag any component that displays unscoped data
- Flag any permission check that ignores tenant context
- Flag any configuration value hardcoded per tenant name

These are all open questions that must be resolved before migration proceeds.

---

## 5.8  Open Questions (Multi-Tenant — Initial)

The following questions must be answered before full multi-tenant enforcement can be implemented:

1. What permissions does each role have at the feature level?
2. Are any workflows shared across tenants (e.g., referrals from broker to insurer)?
3. What is the data-sharing governance model between participating tenants?
4. Are dashboard widgets and reports ever shared across tenants?
5. Which features require tenant-specific configuration vs. platform-wide defaults?

These are logged in `Technical Documentation/08-Open-Questions.md`.

---

## 5.9  Module Licensing

**Decision date:** 2026-03-12. All questions resolved — see OQ-033 through OQ-039 in `08-Open-Questions.md`. Full architecture in `Technical Documentation/12-Module-Access-Control.md`.

### 5.9.1  What a module is

A **module** is a named, licensable unit of functionality granted to an org by a PolicyForge admin. It maps to one or more domains/workflows. Example keys: `module:submission-workflow`, `module:binding-authorities`, `module:bordereau-import`, `module:claims`, `module:finance`, `module:reporting`.

### 5.9.2  Licensing is per-org, not per-user

Modules are assigned to the org. The `role` field controls what a user can **do** within a licensed module.  
- `module:claims` being licensed does not mean all users can close claims — that is a role check.  
- Module licensing answers "does this org have access to this domain?" Role answers "can this user perform this action?".

### 5.9.3  Infrastructure dependencies

`parties`, `search`, and `settings` are not independently licensable. They are automatically present in `enabledModules` whenever any commercial module is active. They are resolved by the backend at login time and are not stored in `org_modules`.

### 5.9.4  Module dependency rules

| Module | Requires |
|--------|----------|
| `module:bordereau-import` | `module:binding-authorities` must also be enabled |
| `module:submission-workflow` | `parties` (auto-resolved) |
| `module:claims` | `parties` (auto-resolved) |

The admin UI enforces dependency rules at write time. The backend `requireModule` middleware checks only the target key — it does not re-validate the dependency graph on every request.

### 5.9.5  `org_modules` table

- One row per org per module key
- Writable only by users with `role: internal_admin` — no tenant user can modify this table
- Accessed via `GET /api/admin/orgs/:orgCode/modules` and `PUT /api/admin/orgs/:orgCode/modules`

### 5.9.6  `requireModule` middleware

```js
// Must be applied AFTER requireAuth
app.use('/api/submissions', requireAuth, requireModule('module:submission-workflow'), submissionsRouter)
```

Returns `403 Module not licensed for your organisation` if the key is absent.

### 5.9.7  Session timing

`enabledModules` is baked into the session at login. Module changes made by a `internal_admin` take effect on the affected org's users' **next login**. No active sessions are invalidated.

### 5.9.8  Client behaviour for unlicensed modules

- Sidebar nav items for unlicensed modules are **completely hidden** — no greyed-out state
- Direct URL navigation to an unlicensed route **redirects to `/app-home`** — no error page
- `<ModuleGuard module="...">` implements this in the router

### 5.9.9  Admin interface

The `internal_admin` role has access to platform admin settings within the `settings` domain (separate from tenant admin settings). This sub-section includes org module management, org hierarchy, and audit log. Routes under `/settings/admin/` are blocked at the API level for non-`internal_admin` users.

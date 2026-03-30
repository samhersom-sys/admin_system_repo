# PROJECT DOCUMENTATION — 06: MULTI-TENANT RULES

This document defines how Policy Forge handles multiple organisations (tenants) sharing the same platform.  These rules apply to every layer of the system.

For AI-specific enforcement rules, see `AI Guidelines/05-Multi-Tenant-Rules.md`.

---

## 6.1  The Tenant Model

A **tenant** is a subscribing organisation that uses Policy Forge.  Each tenant has:

- A unique `org_code` — the primary tenant identifier
- Their own users, each with a `role` and `org_code`
- Their own data (submissions, quotes, policies, etc.)
- Their own configuration (products, rating rules, field metadata)

Tenants share the same application code and database infrastructure but are logically isolated.

---

## 6.2  The Two-Tier Account Hierarchy

```
PolicyForge Platform
│
├── Internal Users (PolicyForge staff)
│     └── Platform Administrator — cross-tenant visibility, platform configuration
│
└── External Users (per-tenant)
      ├── Tenant Administrator — manages users and config for their org
      ├── Underwriter — creates and manages quotes, reviews submissions
      ├── Broker — submits risks, views submission and quote status
      ├── Claims Handler — manages claim records
      └── Finance — views invoices, processes payments
```

**Current state:** The database schema includes `role` and `org_code` on every user.  However, no API route enforces tenant filtering by `org_code` and no permission middleware is in place.  This is the primary architectural gap to fix in the transition.

---

## 6.3  Data Isolation Rules

| Rule | Implementation |
|------|---------------|
| Every API query that reads data must filter by `org_code` | Backend middleware or query parameter |
| Every API route that creates data must attach `org_code` | Backend middleware |
| No query may ever return data from multiple tenants unless the caller is a platform admin | Verified at every route |
| Cross-tenant data access must be explicitly authorised and audited | Data-sharing governance model (OQ-009) |

---

## 6.4  Visibility Rules

| What | Rule |
|------|------|
| Submissions | A user sees only their tenant's submissions |
| Quotes | A user sees only their tenant's quotes |
| Policies | A user sees only their tenant's policies |
| Binding Authorities | Scoped to tenant |
| Claims | Scoped to tenant |
| Parties | Scoped to tenant (platform-wide party records are an open question — OQ-009) |
| Reports and Dashboards | Scoped to tenant |
| Notifications | Scoped to tenant and user |
| Settings and Configuration | Scoped to tenant |

---

## 6.5  Permission Rules

Permissions are evaluated by the `permissions` shared service.  Each permission check receives:

1. The action being attempted
2. The user's role and org code
3. Optional: the resource being accessed (for ownership checks)

Permissions must never be hardcoded in component conditionals.  All permission checks must flow through the shared service.

**Roles and initial permission intent:**

| Role | Description |
|------|-------------|
| `platform-admin` | Full cross-tenant access, platform configuration |
| `tenant-admin` | Full access within their own tenant |
| `underwriter` | Creates and manages quotes, reviews submissions, binds policies |
| `manager` | All underwriter capabilities plus submission assignment |
| `broker` | Creates submissions, views quote status, cannot bind policies |
| `claims-handler` | Creates and manages claims |
| `finance` | Views invoices and financial records |

The full permission matrix is an open question — see OQ-008.

---

## 6.6  Configuration-Driven Behaviour

Tenant-specific behaviour must be driven by configuration stored in the `settings` domain.  It must never be hardcoded using org code comparisons.

**Correct pattern:**
```
const config = await settings.getTenantConfig(orgCode);
if (config.requiresClearanceCheck) { ... }
```

**Forbidden pattern:**
```
if (orgCode === 'LLOYD_OF_LONDON') { ... }
```

---

## 6.7  Cross-Tenant Workflows (Data Sharing)

Some scenarios involve data flowing between tenants (e.g. a broker submits to an insurer; an insurer refers a risk to a co-insurer).  These are cross-tenant workflows.

Cross-tenant workflows:
- Must be explicitly initiated by both parties
- Must be governed by a data-sharing agreement recorded in the system
- Must be audited at every step
- Must never expose data beyond what is agreed

This is a planned capability, not currently implemented.  See OQ-009.

---

## 6.8  Known Gaps in the Legacy Codebase

| Gap | Risk | Priority |
|-----|------|----------|
| No `org_code` filtering on any API route | Any authenticated user can read all tenants' data | Critical |
| No permission middleware on API routes | Any authenticated user can perform any action | Critical |
| No tenant-scoped notification queries | Notifications could leak across tenants | High |
| Permission checks embedded in JSX conditionals | Hard to audit, easy to miss | Medium |
| No cross-tenant governance model | Cannot safely support referrals or shared workflows | Medium |

All gaps are tracked in `Technical Documentation/09-Risk-Register.md`.

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

---

## 5.10  Two Tiers of Database Data

Every table in Policy Forge belongs to one of two tiers. The tier determines how data is scoped, who owns it, and how it is seeded and queried.

| Tier | Name | Who owns it | `org_code` column? | API filtering rule | Seeded how |
|------|------|-------------|--------------------|--------------------|------------|
| 1 | **Platform data** | PolicyForge (internal) | No | No `org_code` filter on the Tier 1 table itself | Once, globally |
| 2 | **Tenant data** | Each subscribing organisation | Yes | Every query **must** filter by `org_code` | Per org |

> **Critical rule:** Tier 1 definitions (measure `filterExpr` strings, lookup values) may be used to *build* queries, but those queries always target Tier 2 tables. The Tier 2 scoping rule applies unconditionally. You must never execute a measure or any derived SQL against a Tier 2 table without an `org_code` WHERE clause. The two tiers must never be mixed in a way that bypasses tenant isolation.

---

### 5.10.1  Platform data (Tier 1)

Platform data is defined and maintained by PolicyForge developers. It is identical for all tenants. No tenant can modify it. It is safe to query without an `org_code` filter.

| Table | Description |
|-------|-------------|
| `lookup_submission_statuses` | Valid status values for submissions |
| `lookup_quote_statuses` | Valid status values for quotes |
| `lookup_policy_statuses` | Valid status values for policies |
| `lookup_ba_statuses` | Valid status values for binding authorities |
| `lookup_contract_types` | Lloyd's / company / co-insurance etc. |
| `lookup_methods_of_placement` | Open market, lineslip, binder etc. |
| `lookup_renewal_statuses` | New, renewal, re-broke etc. |
| `lookup_transaction_types` | Premium, adjustment, return premium etc. |
| `lookup_loss_qualifiers` | AOP, CAT, flood etc. |
| `lookup_claim_statuses` | Open, closed, reserved etc. |
| `lookup_classes_of_business` | Marine, property, liability etc. |
| `lookup_basis_for_order` | Lloyd's basis-for-order codes |
| `lookup_analysis_basis` | Risk, occurrence, claims-made etc. |
| `lookup_date_basis` | Anniversary, continuous etc. |
| `lookup_workflow_statuses` | Workflow stage labels |
| `lookup_party_roles` | Broker, insured, co-insurer etc. |
| `lookup_coverages` | Standard coverage type library |
| `lookup_coverage_detail_types` | Sub-classifications of coverage |
| `lookup_coverage_detail_sub_types` | Further sub-classifications |
| `lookup_currencies` | ISO 4217 currency codes |
| `lookup_countries` | ISO 3166 country list |
| `lookup_regions` | Geographic region groupings |
| `lookup_subdivisions` | Country subdivisions (states, provinces) |
| `lookup_sic_codes` | Standard Industry Classification codes |
| `lookup_risk_codes` | Lloyd's risk codes |
| `lookup_class_risk_codes` | Risk codes per class of business |
| `lookup_tax_rules` | IPT / tax rules by jurisdiction |
| `system_error_catalog` | Canonical error codes and messages |
| `notification_messages` | Platform-defined notification text templates |
| `notification_templates` | Trigger-to-message mapping definitions |

**Rule:** Lookup tables are never filtered by `org_code` on their own. They are read-only from a tenant's perspective.

> **Measure definitions** (`field-mappings.ts` → `DATA_SOURCES`) are Tier 1 in the sense that they are developer-maintained code shared across all tenants. They contain `filterExpr` SQL fragments (e.g. `"status = 'Active'"`). These fragments are combined with Tier 2 queries at runtime. See `§5.10.5`.

---

### 5.10.2  Tenant data (Tier 2)

Tenant data is created and owned by subscribing organisations. Every row belongs to exactly one org. Every query against these tables **must** include a `WHERE org_code = :orgCode` clause (or equivalent JOIN constraint). Missing this filter is a multi-tenancy violation.

| Table | Description |
|-------|-------------|
| `users` | Organisation staff accounts |
| `parties` | Insureds, brokers, and co-insurers for this org |
| `party_entities` | Sub-entities linked to a party |
| `submissions` | Underwriting submissions |
| `quotes` | Quotes on a submission |
| `quote_sections` | Sections within a quote |
| `quote_section_participations` | Syndicate / carrier shares per section |
| `quote_section_risk_codes` | Risk codes attached to quote sections |
| `quote_section_coverages` | Coverages per quote section |
| `policies` | Bound policies |
| `policy_sections` | Sections within a policy |
| `policy_section_participations` | Syndicate / carrier shares per section |
| `policy_coverages` | Coverages per policy section |
| `policy_transactions` | Premium transactions on a policy |
| `claims` | Claims against a policy |
| `binding_authorities` | Binding authority agreements |
| `binding_authority_sections` | Sections within a binding authority |
| `binding_authority_transactions` | Financial transactions on a BA |
| `ba_section_participations` | Carrier shares per BA section |
| `ba_section_authorized_risks` | Authorised risk types per BA section |
| `binding_authority_documents` | Documents attached to a BA |
| `binding_authority_bordereau_configs` | Bordereau import column mappings per BA |
| `locations` | Risk locations (address + schedule) |
| `location_coverages` | Coverages per location |
| `locations_schedule_versions` | Version history for location schedules |
| `policy_location_schedule_rows` | Individual rows in a location schedule |
| `report_templates` | Saved report definitions |
| `report_template_audits` | Audit trail of report template changes |
| `report_template_shares` | Report templates shared within (or across) orgs |
| `report_execution_history` | Log of report runs |
| `dashboard_widgets` | Dashboard widget configurations per user/org |
| `notifications` | Notification records for users in this org |
| `user_notifications` | Per-user read/dismiss state for notifications |
| `chat_messages` | AI assistant conversation history |
| `audit_events` | Immutable audit trail for all tenant actions |
| `submission_edit_locks` | Concurrency lock state per submission |
| `submission_related` | Links between related submissions |
| `org_modules` | Licensed modules for this org (writable only by `internal_admin`) |
| `password_reset_tokens` | Active password reset tokens (expire on use) |
| `password_audit_log` | Audit of password change events |

---

### 5.10.3  Grey-area tables

Some tables are platform-defined but tenant-configurable in scope. These must be documented explicitly.

| Table | Classification | Rationale |
|-------|---------------|-----------|
| `rating_schedules` | Platform default, tenant-overridable | Standard Lloyd's rates ship as platform data; a tenant may have bespoke rates linked via `rating_schedule_binding_authorities` |
| `rating_rules` | Platform default, tenant-overridable | As above |
| `location_premium_calculations` | Linked to a tenant policy | Scoped to the policy, which is tenant-owned |
| `location_premium_adjustments` | Linked to a tenant policy | As above |

**Rule:** When in doubt, if a table contains a foreign key that traces back to a tenant-owned record (e.g. `submission_id`, `policy_id`, `binding_authority_id`), treat it as Tier 2 and require `org_code` scoping through the JOIN chain.

---

### 5.10.4  Implications for API design

| Situation | Required action |
|-----------|----------------|
| Query against a Tier 1 table (lookup read) | No `org_code` filter needed on the Tier 1 table itself |
| Query against a Tier 2 table | **Must** filter by `org_code` from JWT — never from request query params |
| Query joining Tier 1 + Tier 2 | The Tier 2 table anchors the `org_code` filter |
| Measure `filterExpr` applied to any table | The target table is always Tier 2; `org_code` filter is **mandatory** — see `§5.10.5` |
| INSERT into a Tier 2 table | **Must** write `org_code` from JWT — never from request body |
| AI-generated query | AI must state which tier each table belongs to and confirm `org_code` scoping before generating SQL |

---

### 5.10.5  Measures: definition vs. execution

Measure definitions (the `filterExpr`, `type`, and `key` fields in `field-mappings.ts`) are **platform data** — maintained by developers, identical for all tenants, no `org_code` in the definition itself.

Measure execution is always against a Tier 2 table. The two must never be confused.

| Aspect | Classification | Rule |
|--------|---------------|------|
| Measure definition (`field-mappings.ts`) | Tier 1 — platform code | Never store raw SQL `filterExpr` in the database. Live in code only. |
| Measure execution (the generated SQL query) | Tier 2 — tenant data | **Always** include `WHERE {orgCol} = :orgCode`. No exceptions. |
| `filterExpr` content (e.g. `"status = 'Active'"`) | Business logic predicate | Must contain **only** the business condition. Must **never** include an `org_code` clause — that is always the service layer's responsibility. |
| Query built from `filterExpr` | Tier 2 query | The `org_code` filter is added by the executing service using `SourceConfig.orgCol`, not by the `filterExpr` itself. |

**Enforcement rule for all services and the AI:**

Whenever a `filterExpr` from `field-mappings.ts` is interpolated into a SQL string, the containing query **must** also include `AND org_code = $n` (or equivalent parameterised binding). The AI must flag any generated SQL that uses a measure `filterExpr` without a co-located `org_code` filter as a multi-tenancy violation.

**Correct pattern (`home.service.ts`):**
```sql
SELECT
  COUNT(*) AS org_total,
  SUM(CASE WHEN created_by = $2 THEN 1 ELSE 0 END) AS user_total
FROM submissions
WHERE org_code = $1          -- Tier 2 scope — always present
  AND deleted_at IS NULL
```

```sql
SELECT
  SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS org_active   -- filterExpr from field-mappings
FROM policies
WHERE org_code = $1          -- Tier 2 scope — always present
  AND deleted_at IS NULL
```

**Incorrect (multi-tenancy violation — never do this):**
```sql
-- Missing org_code filter — returns data across all tenants
SELECT COUNT(*) FROM submissions WHERE status = 'open'
```

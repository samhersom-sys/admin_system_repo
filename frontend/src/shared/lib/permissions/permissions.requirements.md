# REQUIREMENTS — permissions

**Domain Code:** `PERM`  
**Location:** `lib/permissions/`  
**Status:** Implementation pending  
**Test file:** `lib/permissions/permissions.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `isActionEnabled(actionKey, user)` function; action key registry; role-to-action mapping.  
**Out of scope:** API permission checks; server-side authorisation; JWT validation.

---

## 1a. Impact Analysis

### UI Components

None — `permissions` is a pure function library with no UI.

### API Endpoints

None — all permission checks are client-side using data already in the session.

### Data Dependencies

| Source | Fields Used | Purpose |
|--------|-------------|--------|
| `user` object (from auth-session) | `roles: string[]` | Role-based action gating |
| Action registry (internal) | `actionKey → requiredRoles[]` | Maps action keys to allowed roles |

### Consumers (domains that import permissions)

- All domain pages that conditionally show/hide buttons or actions (e.g. Save, Delete, Assign)
- `AppLayout` — sidebar navigation item visibility
- `RequireAuth` — route-level access control

---

## 2. Requirements

**REQ-PERM-F-001:** The `isActionEnabled(actionKey, user)` function shall return `false` for any action key when `user` is `null`.

**REQ-PERM-F-002:** The `isActionEnabled(actionKey, user)` function shall return `false` for any action key when `user` is `undefined`.

**REQ-PERM-F-003:** The `isActionEnabled(actionKey, user)` function shall return `true` when the action is registered with an empty roles array and the user is non-null.

**REQ-PERM-F-004:** The `isActionEnabled(actionKey, user)` function shall return `true` when the user's `roles` array contains at least one role required by the registered action.

**REQ-PERM-F-005:** The `isActionEnabled(actionKey, user)` function shall return `false` when none of the user's roles appear in the required roles list for the registered action.

**REQ-PERM-F-006:** The `isActionEnabled(actionKey, user)` function shall return `false` when the action key is not present in the action registry.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-PERM-F-001 | `lib/permissions/permissions.test.ts` | pending |
| REQ-PERM-F-002 | `lib/permissions/permissions.test.ts` | pending |
| REQ-PERM-F-003 | `lib/permissions/permissions.test.ts` | pending |
| REQ-PERM-F-004 | `lib/permissions/permissions.test.ts` | pending |
| REQ-PERM-F-005 | `lib/permissions/permissions.test.ts` | pending |
| REQ-PERM-F-006 | `lib/permissions/permissions.test.ts` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-PERM-{TYPE}-{NNN} format per Guideline 13 |
| 2026-04-05 | Added Impact Analysis (§1a): pure function library — no UI/API/DB; documents data dependencies and consumers |

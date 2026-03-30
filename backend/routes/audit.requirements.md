# REQUIREMENTS — Backend Route: Audit Events

**Domain Code:** `AUDIT-BE`  
**Location:** `backend/routes/audit.js`  
**Routes mounted at:** `/api/audit`  
**Status:** Requirements agreed — tests and implementation follow  
**Test file:** `backend/__tests__/audit.test.js`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `POST /api/audit/event` — write a single audit event (entity opened, closed, updated, created, deleted)
- `GET /api/audit/:type/:id` — read the full ordered audit history for one entity

**Out of scope:**
- Bulk audit queries (used by Search — that is the responsibility of `backend/routes/search.js`)
- Purging or archiving old audit events

---

## 2. Data Model

The `audit_event` table:

```sql
CREATE TABLE IF NOT EXISTS public.audit_event (
  id          BIGSERIAL PRIMARY KEY,
  entity_type TEXT        NOT NULL,   -- 'Submission' | 'Quote' | 'Policy' | 'BindingAuthority' | 'Party' | 'Claim'
  entity_id   INTEGER     NOT NULL,
  action      TEXT        NOT NULL,   -- 'Submission Opened' | 'Submission Updated' | etc.
  details     JSONB       NOT NULL DEFAULT '{}',
  created_by  TEXT        NOT NULL,   -- user_name at time of event
  user_id     INTEGER,                -- NULL for system/legacy events
  user_name   TEXT        NOT NULL,   -- denormalised for query performance
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_entity
  ON public.audit_event (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_user_action
  ON public.audit_event (user_id, action, created_at DESC);
```

**Entity type values (canonical set):**

| Value | Domain |
|-------|--------|
| `Submission` | Submission domain |
| `Quote` | Quote domain |
| `Policy` | Policy domain |
| `BindingAuthority` | Binding Authority domain |
| `Party` | Party domain |
| `Claim` | Claims domain |

---

## 3. Requirements

### 3.1 POST /api/audit/event

**REQ-AUDIT-BE-F-001:** The endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-AUDIT-BE-F-002:** The request body shall contain `entityType` (string), `entityId` (integer), and `action` (string). The endpoint shall return HTTP 400 when any of these fields is missing or invalid.

**REQ-AUDIT-BE-F-003:** The optional `details` field in the request body shall be stored as JSONB. When absent, an empty object `{}` shall be stored.

**REQ-AUDIT-BE-F-004:** The `created_by`, `user_id`, and `user_name` fields on the stored record shall be taken from `req.user` (the authenticated JWT payload) — never from the request body.

**REQ-AUDIT-BE-F-005:** The endpoint shall apply a **duplicate-event guard**: if an event with the same `entity_type`, `entity_id`, `action`, and `user_name` was written within the last 10 seconds, the endpoint shall return HTTP 200 with `{ skipped: true }` without writing a duplicate row.

**REQ-AUDIT-BE-F-006:** On success (new event written), the endpoint shall return HTTP 201 with the full inserted event row.

**REQ-AUDIT-BE-F-007:** The endpoint shall return HTTP 500 with `{ error: string }` when the database operation fails.

### 3.2 GET /api/audit/:type/:id

**REQ-AUDIT-BE-F-008:** The endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-AUDIT-BE-F-009:** The endpoint shall return HTTP 200 with an array of audit event objects for the entity identified by `type` and `id`, ordered by `created_at ASC, id ASC` (oldest first).

**REQ-AUDIT-BE-F-010:** Each object in the returned array shall contain the fields: `action`, `user` (= `user_name`), `userId`, `date` (= `created_at`), `changes` (= `details.changes` or `undefined`), `details` (= `details.details` or `undefined`).

**REQ-AUDIT-BE-F-011:** When no events exist for the entity, the endpoint shall return HTTP 200 with an empty array `[]`.

**REQ-AUDIT-BE-F-012:** The endpoint shall return HTTP 400 when `id` is not a valid integer.

### 3.3 NestJS AuditService — Concurrent User Detection

The following requirements apply to `backend/nest/src/audit/audit.service.ts`. They extend the Express route requirements above and supersede the prior "out of scope" designation for concurrent user detection (resolved via OQ-QUO-BE-NE-004 and OQ-AUDIT-001).

**REQ-AUDIT-BE-F-013:** The `AuditService.detectConcurrentUsers(entityType, entityId, currentUserName)` method shall query all `audit_event` rows for the given entity where `action IN ('${entityType} Opened', '${entityType} Closed')`, ordered by `created_at ASC`. It shall compute the net open count per user (increment by 1 for each Opened event, decrement by 1 for each Closed event) and return a `string[]` of `user_name` values where net count > 0, excluding the `currentUserName`. An empty array shall be returned when no other users are detected.

**REQ-AUDIT-BE-F-014:** When `AuditService.writeEvent` is called with an `action` that contains the word `"Opened"`, the method shall call `detectConcurrentUsers` after writing the event and include the result as `otherUsersOpen: string[]` in its return value alongside the inserted audit row. When `action` does not contain `"Opened"`, `otherUsersOpen` shall be absent from the return value.

> **Rationale (OQ-AUDIT-001):** `otherUsersOpen` is embedded in the POST audit response (not a separate endpoint) because: (1) the `useAudit` hook already reads `data.otherUsersOpen` from the POST response; (2) all legacy entity endpoints return `otherUsersOpen` from the same POST response — the pattern is established; (3) avoids a second HTTP round-trip on page load. See `08-Open-Questions.md` OQ-AUDIT-001.

---

## 4. Security

- All routes require JWT authentication (§1.15 Backend-First Enforcement Checklist).
- `user_id` and `user_name` are taken from the verified JWT payload — they cannot be spoofed via the request body.
- No org-scoping is applied to audit reads — a user can read audit events for any entity they have already authenticated. Entity-level access control is the responsibility of the calling domain route.

---

## 5. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|---------|
| REQ-AUDIT-BE-F-001 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R01 |
| REQ-AUDIT-BE-F-002 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R02 |
| REQ-AUDIT-BE-F-003 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R03 |
| REQ-AUDIT-BE-F-004 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R04 |
| REQ-AUDIT-BE-F-005 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R05 |
| REQ-AUDIT-BE-F-006 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R06 |
| REQ-AUDIT-BE-F-007 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R07 |
| REQ-AUDIT-BE-F-008 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R08 |
| REQ-AUDIT-BE-F-009 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R09 |
| REQ-AUDIT-BE-F-010 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R10 |
| REQ-AUDIT-BE-F-011 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R11 |
| REQ-AUDIT-BE-F-012 | `backend/__tests__/audit.test.js` | T-BE-AUDIT-R12 |
| REQ-AUDIT-BE-F-013 | `backend/nest/src/audit/audit.spec.ts` | pending — Stage 2 |
| REQ-AUDIT-BE-F-014 | `backend/nest/src/audit/audit.spec.ts` | pending — Stage 2 |

---

## 6. Change Log

| Date | Change |
|------|--------|
| 2026-03-13 | Initial requirements written |
| 2026-03-25 | Concurrent user detection removed from out-of-scope. F-013 (detectConcurrentUsers) and F-014 (otherUsersOpen in writeEvent response) added as §3.3 NestJS AuditService requirements. Traceability updated. Rationale for POST-response pattern recorded (OQ-AUDIT-001). |

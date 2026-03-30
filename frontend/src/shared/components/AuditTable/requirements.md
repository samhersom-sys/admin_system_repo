# REQUIREMENTS — AuditTable & useAudit Shared Components

**Domain Code:** `SHARED-AUDIT`
**Location:** `frontend/src/shared/components/AuditTable/` and `frontend/src/shared/hooks/`
**Status:** Agreed — ready for tests and code
**Test file:** `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx`
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `AuditTable` component — renders a read-only audit history table (Action, User, Date & Time, Details columns)
- `useAudit` hook — manages "entity opened/closed" lifecycle events and on-demand audit trail fetching from the backend

**Out of scope:**
- Real-time concurrent-user detection (deferred to a future block)
- Audit event filtering or searching within the table (deferred)
- Pagination of audit events (deferred)

---

## 2. Impact Analysis

### UI / Front-End Impact
- **New:** `frontend/src/shared/components/AuditTable/AuditTable.tsx`
- **New:** `frontend/src/shared/hooks/useAudit.ts`
- **Consumed by:** `frontend/src/quotes/QuoteViewPage/QuoteViewPage.tsx` (Audit tab)

### API Impact
- **New:** `GET /api/quotes/:id/audit` — fetches the audit trail for a quote (see `backend/routes/quotes.requirements.md` REQ-QUO-BE-F-013)
- **New:** `POST /api/quotes/:id/audit` — writes a single audit event (see REQ-QUO-BE-F-014)
- The existing `GET /api/audit/:type/:id` and `POST /api/audit/event` generic endpoints are used by `useAudit` via the entity-specific quote routes.

### Database Impact
None — the `audit_event` table already exists per `backend/routes/audit.requirements.md`.

---

## 3. Requirements

### AuditTable Component

#### REQ-SHARED-AUDIT-F-001
The `AuditTable` component shall render a `<table>` with four column headers: **Action**, **User**, **Date & Time**, and **Details**, in that order.

#### REQ-SHARED-AUDIT-F-002
The `AuditTable` component shall render a single `<td>` spanning all four columns with the text "No audit history available for this {entityType}." (where `entityType` is the prop value) when the `audit` prop is an empty array.

#### REQ-SHARED-AUDIT-F-003
The `AuditTable` component shall format `row.date` using `en-GB` locale in the pattern `DD/MM/YYYY, HH:MM:SS` (24-hour clock) in the Date & Time cell. When `row.date` is falsy, it shall display "—".

#### REQ-SHARED-AUDIT-F-004
The `AuditTable` component shall render each entry in `row.changes` as a separate line showing: `{field}: {oldValue} → {newValue}`, where `oldValue` is displayed with a red colour and line-through decoration, and `newValue` is displayed in green, when `row.changes` is a non-empty array.

#### REQ-SHARED-AUDIT-F-005
The `AuditTable` component shall render `row.details` as plain text in the Details cell when `row.changes` is absent or empty and `row.details` is a non-empty string.

#### REQ-SHARED-AUDIT-F-006
The `AuditTable` component shall render "—" in the Details cell when both `row.changes` and `row.details` are absent or empty.

### useAudit Hook

#### REQ-SHARED-AUDIT-F-007
The `useAudit` hook shall call `POST /api/quotes/{entityId}/audit` with body `{ action: "{entityType} Opened", user: userName, userId }` on mount when `entityId` is a valid positive integer and `trackVisits` is `true`.

#### REQ-SHARED-AUDIT-F-008
The `useAudit` hook shall call `POST /api/quotes/{entityId}/audit` with body `{ action: "{entityType} Closed", user: userName, userId }` on unmount when `entityId` is a valid positive integer and `trackVisits` is `true`.

#### REQ-SHARED-AUDIT-F-009
The `useAudit` hook shall not post Opened or Closed events when `entityId` is falsy (null, undefined, or `"new"`).

#### REQ-SHARED-AUDIT-F-010
The `useAudit` hook shall expose a `getAudit()` function that calls `GET /api/quotes/{entityId}/audit`, parses the JSON response array, and stores it in the hook's `audit` state.

#### REQ-SHARED-AUDIT-F-011
The `useAudit` hook shall expose the state values `audit` (array), `loading` (boolean), and `error` (string | null) to its consumers.

#### REQ-SHARED-AUDIT-F-012
The `useAudit` hook shall use the authenticated user's `userName` and `userId` from the auth-session store when building the POST body — it shall not accept these values as parameters so they cannot be spoofed by the caller.

---

## 4. Traceability Table

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-SHARED-AUDIT-F-001 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-002 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-003 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-004 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-005 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-006 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-007 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-008 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-009 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-010 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-011 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |
| REQ-SHARED-AUDIT-F-012 | `frontend/src/shared/components/AuditTable/__tests__/AuditTable.test.tsx` | pending |

---

## 5. Open Questions
None.

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-03-19 | Initial requirements written — Block 3 scope |

---

## 7. Design Notes

### AuditTable Props

```ts
interface AuditRow {
  action: string;
  user?: string;
  userId?: number;
  date?: string;
  changes?: Array<{ field: string; oldValue: string; newValue: string }>;
  details?: string;
}

interface AuditTableProps {
  audit: AuditRow[];
  entityType?: string;   // default: "Record"
}
```

### useAudit Options

```ts
interface UseAuditOptions {
  entityType: string;    // e.g. 'Quote'
  entityId: number | null;
  trackVisits?: boolean; // default: true
}

interface UseAuditResult {
  audit: AuditRow[];
  loading: boolean;
  error: string | null;
  getAudit: () => Promise<void>;
}
```

### Auth integration
`useAudit` reads `userName` and `userId` from the existing auth-session store (same pattern as other hooks in the app). No prop drilling required.

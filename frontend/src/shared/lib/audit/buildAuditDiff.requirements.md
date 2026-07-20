# buildAuditDiff — Shared Audit Diff Utility Requirements

## 1. Overview

`buildAuditDiff` is a pure utility function that produces a human-readable, semicolon-separated
string describing the differences between two form-value snapshots. It is consumed by all domain
view pages when writing "Updated" audit events so the audit history shows exactly what changed.

File: `frontend/src/shared/lib/audit/buildAuditDiff.ts`
Test: `frontend/src/shared/lib/audit/buildAuditDiff.test.ts`

---

## 2. Requirements

### REQ-SHARED-AUDIT-F-001 — No diff returns empty string

**REQ-SHARED-AUDIT-F-001:** When `prev` and `next` contain identical values for all keys present
in `labels`, `buildAuditDiff` shall return an empty string `''`.

Acceptance criteria:
- `buildAuditDiff({ a: 'x' }, { a: 'x' }, { a: 'Field A' })` returns `''`
- `buildAuditDiff({}, {}, { a: 'Field A' })` returns `''`

---

### REQ-SHARED-AUDIT-F-002 — Changed fields produce "Label: old → new" entries

**REQ-SHARED-AUDIT-F-002:** When `prev` and `next` differ on a field that exists in `labels`,
`buildAuditDiff` shall include an entry of the form `"{Label}: {old} → {new}"` for each changed
field. Multiple changed fields shall be joined with `"; "`.

Acceptance criteria:
- `buildAuditDiff({ a: 'x' }, { a: 'y' }, { a: 'Field A' })` returns `'Field A: x → y'`
- Two changed fields produce `'Field A: x → y; Field B: 1 → 2'`

---

### REQ-SHARED-AUDIT-F-003 — Null/undefined display as em-dash; only labels-keyed fields compared

**REQ-SHARED-AUDIT-F-003:** Fields not present in `labels` shall be ignored.  
When a value is `null`, `undefined`, or `''`, the display value shall be `'—'`.  
The comparison itself treats `null`, `undefined`, and `''` as equivalent to `''`, so no diff
is recorded when both sides are empty.

Acceptance criteria:
- `buildAuditDiff({ a: 'x', b: 'y' }, { a: 'z', b: 'w' }, { a: 'A' })` returns `'A: x → z'`
  (field `b` is ignored because it is not in `labels`)
- `buildAuditDiff({ a: null }, { a: 'val' }, { a: 'Field A' })` returns `'Field A: — → val'`
- `buildAuditDiff({ a: '' }, { a: undefined }, { a: 'Field A' })` returns `''`
  (both sides are empty, treated as equal)

---

## 3. Traceability

| Requirement | Test file | Test ID |
|---|---|---|
| REQ-SHARED-AUDIT-F-001 | `shared/lib/audit/buildAuditDiff.test.ts` | T-SHARED-AUDIT-R001 |
| REQ-SHARED-AUDIT-F-002 | `shared/lib/audit/buildAuditDiff.test.ts` | T-SHARED-AUDIT-R002 |
| REQ-SHARED-AUDIT-F-003 | `shared/lib/audit/buildAuditDiff.test.ts` | T-SHARED-AUDIT-R003 |

---

## 4. Change Log

| Date | Change |
|------|--------|
| today | Initial requirements written. buildAuditDiff created. REQ-SHARED-AUDIT-F-001 to F-003. |

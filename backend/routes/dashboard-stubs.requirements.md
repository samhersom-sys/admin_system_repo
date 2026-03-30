# REQUIREMENTS — Dashboard Stub Routes

**Domain Code:** `DASH-STUB`
**Status:** Stub / scaffold — returns safe empty data until domain tables are built
**Test file:** `backend/__tests__/api-smoke.test.js`
**Second artifact:** See smoke tests (`REQUIRED_200_ENDPOINTS` entries)

---

## 1. Scope

These routes exist to prevent the frontend dashboard widgets (KpiWidget, GwpChartWidget,
CumulativeGwpWidget, RecentActivityWidget, TasksWidget) from returning HTTP 500 errors
while the corresponding database tables are not yet migrated.

Each route returns a valid, empty response structure consistent with the shape expected
by the frontend widget. No data is fabricated.

---

## 2. Requirements

### 2.1 Quotes stub

**REQ-DASH-STUB-F-001:** `GET /api/quotes` shall return HTTP 200 with an empty JSON array `[]`
until the `quote` table is built. All query params (orgCode, assignedTo, status) shall be
accepted and silently ignored.

### 2.2 Policies stub

**REQ-DASH-STUB-F-002:** `GET /api/policies` shall return HTTP 200 with `[]`.

**REQ-DASH-STUB-F-003:** `GET /api/policies/gwp-monthly` shall return HTTP 200 with
`{ series: [] }`.

**REQ-DASH-STUB-F-004:** `GET /api/policies/gwp-cumulative` shall return HTTP 200 with
`{ series: [] }`.

**REQ-DASH-STUB-F-005:** `GET /api/policies/gwp-summary` shall return HTTP 200 with
`{ orgTotal: 0, userTotal: 0 }`.

### 2.3 Binding Authorities stub

**REQ-DASH-STUB-F-006:** `GET /api/binding-authorities` shall return HTTP 200 with `[]`.

### 2.4 Notifications stub

**REQ-DASH-STUB-F-007:** `GET /api/notifications` shall return HTTP 200 with `[]`.

### 2.5 Recent records

**REQ-DASH-STUB-F-008:** `GET /api/recent-records-data` shall return HTTP 200 with an object
`{ submissions, quotes, policies, bindingAuthorities }`. Submissions are populated from the
`submission` table (most recent 15 by `createdDate` for the caller's `orgCode`). All other
types return `[]` until their tables exist.

### 2.6 Tasks stub

**REQ-DASH-STUB-F-009:** `GET /api/tasks` shall return HTTP 200 with `[]`. This endpoint
is listed as KNOWN_UNIMPLEMENTED in the smoke tests and is deferred pending the workflow
domain build. When built, remove from KNOWN_UNIMPLEMENTED.

---

## 3. Traceability

| Requirement ID | Test file | Test ID |
|---|---|---|
| REQ-DASH-STUB-F-001 | `backend/__tests__/api-smoke.test.js` | `GET /api/quotes → 200` |
| REQ-DASH-STUB-F-002 | `backend/__tests__/api-smoke.test.js` | `GET /api/policies → 200` |
| REQ-DASH-STUB-F-003 | `backend/__tests__/api-smoke.test.js` | KNOWN_UNIMPLEMENTED (tracked) |
| REQ-DASH-STUB-F-004 | `backend/__tests__/api-smoke.test.js` | KNOWN_UNIMPLEMENTED (tracked) |
| REQ-DASH-STUB-F-006 | `backend/__tests__/api-smoke.test.js` | `GET /api/binding-authorities → 200` |
| REQ-DASH-STUB-F-007 | `backend/__tests__/api-smoke.test.js` | `GET /api/notifications → 200` |
| REQ-DASH-STUB-F-008 | `backend/__tests__/api-smoke.test.js` | `GET /api/recent-records-data → 200` |

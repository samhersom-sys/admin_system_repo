# Batch PSS-A — Manual Review Checklist

**Batch:** PSS-A — Broker Organisation Foundation  
**Status:** Implementation complete — awaiting manual verification  
**Design reference:** `docs/Project Documentation/platform-shared-submissions-design.md`  
**Requirements:**
- `frontend/src/broker-submissions/broker-submissions.requirements.md` (PSS-BRK-DOM)
- `backend/nest/src/broker-submissions/broker-submissions.requirements.md` (PSS-BRK-BE)
- `frontend/src/broker-submissions/BrokerSubmissionsPage.requirements.md` (PSS-BRK-LIST)
- `frontend/src/broker-submissions/NewBrokerSubmissionPage.requirements.md` (PSS-BRK-NEW)

---

## Prerequisites

Before starting, ensure:

- [ ] Backend is running: `npm run dev:local` (or docker-compose)
- [ ] Database migrations have been applied (check logs for migration output)
- [ ] You have access to the following test accounts:

| Account | Credentials | Role | Org | Expected behaviour |
|---|---|---|---|---|
| Platform admin | `admin@policyforge.com` / `Admin123!` | `internal_admin` | DEMO (platform) | Can VIEW broker submissions |
| Broker user | Create via `db/seeds` with `orgCode: 'BRK1'` | Any | BRK1 (broker) | Full access — create, view, update |
| Insurer user | `admin@company.com` / `Company123!` | `client_admin` | DEMO (insurer mapped) | Redirected — no access |

> **Note:** The DEMO org is seeded as `org_type = 'platform'` so `admin@policyforge.com` gets `orgType = 'platform'` in their JWT. Any org NOT in the `organisations` table defaults to `'insurer'` per REQ-PSS-BRK-DOM-F-010.

---

## Section 1 — Access Control

### 1.1 Platform administrator access (REQ-PSS-BRK-LIST-S-003)

- [ ] **Login as `admin@policyforge.com`**
- [ ] Confirm the "Broker Submissions" item appears in the left-hand sidebar
- [ ] Navigate to `/broker-submissions` — page loads without being redirected
- [ ] Page shows a submissions table (or empty state) without any access error
- [ ] "New Submission" button is visible (note: this button should work — see S-003 re: read-only scope)
- [ ] Confirm the page header reads "Broker Submissions"

### 1.2 Broker user access (REQ-PSS-BRK-LIST-S-001)

- [ ] Login as a broker user (orgCode `BRK1`, see seed instructions below)
- [ ] Confirm "Broker Submissions" appears in the sidebar
- [ ] Navigate to `/broker-submissions` — page loads
- [ ] Can see submissions belonging to org `BRK1` only
- [ ] Can navigate to `/broker-submissions/new` and create a submission

### 1.3 Non-broker, non-admin redirect (REQ-PSS-BRK-LIST-S-001)

- [ ] Login as `admin@company.com` (DEMO org — not a broker org, not `internal_admin` role)
- [ ] Confirm "Broker Submissions" does NOT appear in the sidebar
- [ ] Manually navigate to `/broker-submissions` — confirm redirect to `/app-home` (or `/`)
- [ ] Confirm no broker submission data is shown at any point

### 1.4 Unauthenticated access (REQ-PSS-BRK-LIST-S-002)

- [ ] Clear session (close and reopen tab, or call `/api/auth/logout`)
- [ ] Navigate directly to `/broker-submissions` — confirm redirect to `/login`
- [ ] Navigate directly to `/broker-submissions/new` — confirm redirect to `/login`

---

## Section 2 — Broker Submissions List Page

### 2.1 List display (REQ-PSS-BRK-LIST-F-001/002)

- [ ] As broker user with existing submissions, navigate to `/broker-submissions`
- [ ] Confirm the table is rendered with columns: Reference, Insured, Class of Business, Est. Premium, Type, Status
- [ ] Confirm each row shows the correct data for the corresponding submission
- [ ] Confirm a submission with no reference shows "—" in the Reference column

### 2.2 Empty state (REQ-PSS-BRK-LIST-F-003)

- [ ] As a broker user with no submissions, navigate to `/broker-submissions`
- [ ] Confirm an empty state message is shown (e.g. "No submissions yet")
- [ ] Confirm no "Clear filters" prompt appears in the empty state

### 2.3 Loading state (REQ-PSS-BRK-LIST-F-006)

- [ ] Navigate to `/broker-submissions` and observe the page briefly before data loads
- [ ] A loading indicator should be visible while the fetch is in flight

### 2.4 Error state (REQ-PSS-BRK-LIST-F-007)

- [ ] To simulate: stop the backend, then navigate to `/broker-submissions`
- [ ] An error message should appear (role="alert" region)
- [ ] A "Try again" button should be visible
- [ ] Clicking "Try again" re-attempts the fetch

### 2.5 Filtering (REQ-PSS-BRK-LIST-F-008/009/010)

- [ ] Confirm the "Filter by type" dropdown is present with options: All types, Manual, Platform Shared
- [ ] Confirm the "Filter by status" dropdown is present
- [ ] Select "Manual" from type filter — list updates immediately, shows only manual submissions
- [ ] Select "Platform Shared" — shows only platform shared submissions
- [ ] Change status filter — list updates immediately to match
- [ ] With an active filter and no results, the filter-empty state shows with "Clear filters" button (F-004)
- [ ] Clicking "Clear filters" resets both filters and shows all submissions

### 2.6 Navigation (REQ-PSS-BRK-LIST-F-011/012)

- [ ] Click a submission row — navigates to `/broker-submissions/:id`
- [ ] Click "New Submission" button — navigates to `/broker-submissions/new`

---

## Section 3 — New Broker Submission Page

### 3.1 Access

- [ ] As broker user, navigate to `/broker-submissions/new` — page loads
- [ ] As admin user (`admin@policyforge.com`), navigate to `/broker-submissions/new` — page loads
- [ ] As insurer user, navigate to `/broker-submissions/new` — redirected to home

### 3.2 Form fields (REQ-PSS-BRK-NEW-F-001 onwards)

- [ ] Insured Name field is present and required (submitting without it shows validation error)
- [ ] Class of Business field is present (optional)
- [ ] Inception Date field is present and required
- [ ] Expiry Date field auto-fills to +1 year when Inception Date is entered
- [ ] Submission Type radio buttons present: "Manual" and "Platform Shared"
- [ ] Each type option shows a description beneath it
- [ ] Estimated Premium field present (optional)
- [ ] Reference field present (optional)

### 3.3 Validation

- [ ] Submit without Insured Name — error shown, no API call made
- [ ] Submit without Inception Date — error shown
- [ ] Submit without selecting a Type — error shown
- [ ] Set Expiry Date earlier than Inception Date — error shown
- [ ] All required fields filled — form submits successfully

### 3.4 Post-submission

- [ ] On successful submit, navigated to `/broker-submissions/:id` (new submission's detail page)
- [ ] If submit fails, error message shown with form data preserved (user can correct and retry)
- [ ] Unsaved changes banner appears after editing any field
- [ ] Attempting to close/navigate away with unsaved changes triggers browser `beforeunload` warning

---

## Section 4 — Backend API

### 4.1 Access control at API level

Open a terminal and test with curl or Postman:

- [ ] `GET /api/broker-submissions` with no token → 401 Unauthorised
- [ ] `GET /api/broker-submissions` with token from insurer user (not `internal_admin`) → 403 Forbidden
- [ ] `GET /api/broker-submissions` with token from `admin@policyforge.com` (`internal_admin`) → 200 OK, returns all submissions
- [ ] `POST /api/broker-submissions` with token from `admin@policyforge.com` → 403 Forbidden (admin is read-only)

### 4.2 Tenant isolation (REQ-PSS-BRK-BE-S-003)

- [ ] With a broker user token for org `BRK1`, create a submission (`POST /api/broker-submissions`)
- [ ] With a **different** broker user token (different org), call `GET /api/broker-submissions/:id` for the submission created above → 404 Not Found (not 403 — existence must not be revealed)
- [ ] With `admin@policyforge.com` token, call `GET /api/broker-submissions/:id` for the same submission → 200 OK

### 4.3 Source validation (REQ-PSS-BRK-BE-C-002)

- [ ] `POST /api/broker-submissions` with `source: "email"` (unlisted value) → 400 Bad Request
- [ ] `POST /api/broker-submissions` with `source: "manual"` → 201 Created

---

## Section 5 — Sidebar Visibility Matrix

| Account | Role | orgType | "Broker Submissions" in sidebar? |
|---|---|---|---|
| `admin@policyforge.com` | `internal_admin` | `platform` | ✅ Yes |
| Broker user (BRK1 org) | `broker` / `client_admin` | `broker` | ✅ Yes |
| `admin@company.com` | `client_admin` | `insurer` (default) | ❌ No |
| Insurer underwriter | `underwriter` | `insurer` | ❌ No |

---

## Section 6 — Seed Instructions (Creating a Broker Test User)

If you don't yet have a user with `orgCode = 'BRK1'`, add one to `db/seeds/001-users.js`:

```javascript
{
  username: 'broker_demo',
  email: 'broker@demo.com',
  password: 'BrokerTest1!',
  fullName: 'Demo Broker',
  orgCode: 'BRK1',
  role: 'client_admin',
}
```

Then run `npm run db:seed` from the project root (or `node db/seeds/001-users.js` directly).

The `BRK1` org is already seeded into `organisations` with `org_type = 'broker'` by migration `1747000000000-CreateOrganisationsTable.ts`.

---

## Section 7 — Regression Check

Confirm that existing platform features are unaffected by this batch:

- [ ] Login still works for all existing test accounts
- [ ] `/app-home` loads without errors after login
- [ ] Existing sidebar items (Submissions, Quotes, Policies, etc.) still appear for all users
- [ ] Auth token refresh endpoint (`POST /api/auth/refresh`) still returns a valid token
- [ ] Settings pages accessible to `client_admin` users

---

## Sign-off

| Check | Verified by | Date |
|---|---|---|
| Section 1 — Access Control | | |
| Section 2 — List Page | | |
| Section 3 — New Submission Page | | |
| Section 4 — Backend API | | |
| Section 5 — Sidebar matrix | | |
| Section 6 — Seed | | |
| Section 7 — Regression | | |

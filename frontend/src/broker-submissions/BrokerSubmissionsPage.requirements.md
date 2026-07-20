# REQUIREMENTS — Broker Submissions List Page

**Domain Code:** `PSS-BRK-LIST`
**Location:** `frontend/src/broker-submissions/BrokerSubmissionsPage.tsx`
**Status:** Agreed — ready for tests
**Test file:** `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx`
**Standard:** Written per [Guideline 13](../../docs/AI%20Guidelines/13-Requirements-Standards.md)
**Batch:** PSS-A — Broker Organisation Foundation
**Design reference:** `docs/Project Documentation/platform-shared-submissions-design.md §11`

---

## 1. Scope

**In scope:**
- Displaying the list of broker submissions for the signed-in user's organisation
- Filtering the list by submission type and by status
- Navigating to a submission's detail page
- Empty state when no submissions exist
- Loading and error states

**Out of scope:**
- Submission detail view (separate page, Batch PSS-A continued)
- Placement activity or sharing status columns (Batch PSS-B)
- Sorting and column customisation (future enhancement)
- Bulk actions on submissions (future enhancement)

---

## 2. Impact Analysis

### UI / Front-End Impact
New page added: `frontend/src/broker-submissions/BrokerSubmissionsPage.tsx`
New navigation entry added to the sidebar for broker users: "Broker Submissions" → `/broker-submissions`

### API Impact
Calls `GET /api/broker-submissions` (defined in `broker-submissions.requirements.md` PSS-BRK-BE).

### Database Impact
None. This page reads data only; all database changes are covered in the backend requirements.

---

## 3. Requirements

### 3.1 Page access

**REQ-PSS-BRK-LIST-S-001:** The broker submissions list page shall not be accessible to users whose organisation is not classified as a broker, unless they hold the platform administrator role (`internal_admin`). Any other user who navigates to this page shall be redirected to the home page.

**REQ-PSS-BRK-LIST-S-002:** The broker submissions list page shall not be accessible to unauthenticated users. Any unauthenticated user who navigates to this page shall be redirected to the sign-in page.

**REQ-PSS-BRK-LIST-S-003:** A platform administrator (role = `internal_admin`) shall be able to access the broker submissions list page and view submissions from all broker organisations. This access is read-only oversight; platform administrators shall not be able to create new submissions from this page.

**REQ-PSS-BRK-LIST-S-004:** The user's role (`internal_admin`) shall be read from the authenticated session token. Role claims from the URL or request body shall be ignored.

### 3.2 List display

**REQ-PSS-BRK-LIST-F-001:** The broker submissions list page shall display a table of all submissions belonging to the signed-in user's organisation.

**REQ-PSS-BRK-LIST-F-002:** Each row in the submissions table shall show the following information: submission reference (or "—" if the broker has not provided one), insured name, class of business, estimated premium, submission type (Manual or Platform Shared), and current status.

**REQ-PSS-BRK-LIST-F-003:** The page shall display a message informing the user that no submissions have been found when the organisation has no submissions and no filters are active.

**REQ-PSS-BRK-LIST-F-004:** The page shall display a message informing the user that no submissions match their filters when filters are active and the filtered result is empty. The message shall include a prompt to clear the filters.

**REQ-PSS-BRK-LIST-F-005:** The page shall show only submissions belonging to the signed-in user's organisation. Submissions from any other organisation shall never appear in the list.

### 3.3 Loading and error states

**REQ-PSS-BRK-LIST-F-006:** The page shall display a loading indicator while the list of submissions is being retrieved from the platform.

**REQ-PSS-BRK-LIST-F-007:** The page shall display a clear error message if the list of submissions cannot be retrieved, and shall provide the user with the option to try again.

### 3.4 Filtering

**REQ-PSS-BRK-LIST-F-008:** The page shall provide a filter control that allows the user to show only **manual** submissions, only **platform shared** submissions, or all submissions. The default view shall show all submissions.

**REQ-PSS-BRK-LIST-F-009:** The page shall provide a filter control that allows the user to show submissions of a particular status. The default view shall show submissions of all statuses.

**REQ-PSS-BRK-LIST-F-010:** The page shall update the displayed list immediately when the user changes a filter selection, without requiring a full page reload.

### 3.5 Navigation

**REQ-PSS-BRK-LIST-F-011:** The page shall navigate the user to the full detail view of a broker submission when they click on that submission's row in the table.

**REQ-PSS-BRK-LIST-F-012:** The page shall include a clearly labelled button that navigates the user to the new broker submission page when clicked.

### 3.6 Sidebar navigation

**REQ-PSS-BRK-LIST-F-013:** The platform sidebar Create menu shall display a "Broker Submission" entry that navigates to the new broker submission form (`/broker-submissions/new`) for users whose organisation is classified as a broker, and for platform administrators (role = `internal_admin`). Note: the list page (`/broker-submissions`) redirects to the Workflow Submissions page where a Submission Type filter provides filtered access.

**REQ-PSS-BRK-LIST-F-014:** The "Broker Submissions" sidebar item shall not be visible to users who are neither a broker organisation nor a platform administrator.

---

## 4. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-PSS-BRK-LIST-S-001 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-S-002 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-S-003 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-S-004 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-001 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-002 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-003 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-004 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-005 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-006 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-007 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-008 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-009 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-010 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-011 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-012 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-013 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |
| REQ-PSS-BRK-LIST-F-014 | `frontend/src/broker-submissions/__tests__/BrokerSubmissionsPage.test.tsx` | pending |

---

## 5. Open Questions

| ID | Question | Blocks |
|---|---|---|
| OQ-PSS-BRK-006 | Should the list default to sorting by most recently created first, or by some other order? Current assumption: most recently created first. | REQ-PSS-BRK-LIST-F-001 |
| OQ-PSS-BRK-007 | Should estimated premium be displayed in a specific currency format, or as a plain number? Current assumption: formatted with currency symbol using the organisation's default currency setting. | REQ-PSS-BRK-LIST-F-002 |

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-05-15 | Initial requirements written for Batch PSS-A |

---

## 7. Design Notes

### Table columns

| Column heading | Source field | Notes |
|---|---|---|
| Reference | `reference` | Shows "—" if the broker has not provided a reference |
| Insured | `insured_name` | |
| Class of Business | `class_of_business` | |
| Est. Premium | `estimated_premium` | Formatted with currency symbol |
| Type | `source` (lookup display name) | "Manual" or "Platform Shared" |
| Status | `workflow_status` | Displayed as a status badge |

### Route
- List page: `/broker-submissions`
- New submission: `/broker-submissions/new`
- Submission detail: `/broker-submissions/:id`

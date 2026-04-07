# REQUIREMENTS — Workflow Domain (Frontend)

**Domain Code:** `WF-FE`  
**Location:** `frontend/src/workflow/`  
**Status:** Full requirements written — pending tests  
**Test file:** `frontend/src/workflow/__tests__/workflow.test.tsx`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Backup Coverage Map

Sources read from `policy-forge-chat (BackUp)/`:
- `src/layouts/AppLayout/.../Workflow/WorkflowDirectoryPage.jsx`
- `src/layouts/AppLayout/.../Workflow/WorkflowPage.jsx`
- `src/layouts/AppLayout/.../Workflow/ClearanceWorkflowPage.jsx`
- `src/layouts/AppLayout/.../Workflow/DataQualityPage.jsx`
- `backend/server.js` — workflow and clearance routes

| # | BackUp Feature | REQ ID | Status |
|---|---|---|---|
| 1 | Workflow directory — hub with cards | F-001–F-003 | COVERED |
| 2 | Submission workflow — table, filters, stats | F-011–F-020 | COVERED |
| 3 | Assignment modal (manager-only) | F-017–F-019 | COVERED |
| 4 | Email-extracted indicator | F-020 | COVERED |
| 5 | Clearance workflow — duplicate detection | F-031–F-040 | COVERED |
| 6 | Clearance modal — matched submissions | F-037–F-039 | COVERED |
| 7 | Data quality — field validation checks | F-051–F-058 | COVERED |
| 8 | Clearance configuration | — | DEFERRED — Block 2 |

---

## 2. Impact Analysis

### Files to create (Block 1)
- `frontend/src/workflow/WorkflowDirectoryPage/WorkflowDirectoryPage.tsx`
- `frontend/src/workflow/WorkflowPage/WorkflowPage.tsx`
- `frontend/src/workflow/ClearanceWorkflowPage/ClearanceWorkflowPage.tsx`
- `frontend/src/workflow/DataQualityPage/DataQualityPage.tsx`
- `frontend/src/workflow/workflow.service.ts`
- `frontend/src/workflow/__tests__/workflow.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add routes: `/workflow`, `/workflow/submissions`, `/workflow/clearance`, `/workflow/data-quality`
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `patch`
- `@/shared/lib/auth-session/auth-session` — `getSession` (role-based access)
- `react-router-dom` — `useNavigate`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/workflow/submissions` | List submissions with workflow metadata |
| POST | `/api/workflow/submissions/:id/assign` | Assign submission to user |
| PATCH | `/api/workflow/submissions/:id/status` | Update workflow status |
| GET | `/api/clearance/pending` | Pending clearance submissions |
| POST | `/api/clearance/check/:id` | Run duplicate detection |
| POST | `/api/clearance/:id/clear` | Mark as not duplicate |
| POST | `/api/clearance/:id/confirm-duplicate` | Mark as confirmed duplicate |
| GET | `/api/workflow/data-quality` | Fetch data quality issues |
| GET | `/api/users` | Users for assignment dropdowns |

### Database Tables
| Table | Impact |
|---|---|
| `submissions` | Read (workflow fields: workflow_status_code, assigned_to, clearance fields) |
| `lookup_workflow_status` | Read (9 status codes) |
| `clearance_config` | Read (duplicate detection settings) |

---

## 3. Scope

**In scope (Block 1):** WorkflowDirectoryPage (`/workflow`) — navigation hub; WorkflowPage (`/workflow/submissions`) — submission workflow management with status filters, stats cards, assignment modal; ClearanceWorkflowPage (`/workflow/clearance`) — duplicate detection and clearance decisions; DataQualityPage (`/workflow/data-quality`) — field validation issues with severity levels.

**Deferred to Block 2:** Clearance configuration page (tolerance settings, matching rules). Configurable org-level auto-suggestion (see SubmissionTabs R09).

**Out of scope:** AI-powered extraction (separate module); automated workflow rules engine.

---

## 4. Requirements

### 4.1 WorkflowDirectoryPage — /workflow

**REQ-WF-FE-F-001:** The Workflow Directory page shall render a heading with the text `"Workflow"` without throwing an uncaught JavaScript exception on initial render.

**REQ-WF-FE-F-002:** The page shall display three navigation cards: **Submission Workflow** (links to `/workflow/submissions`), **Clearance Workflow** (links to `/workflow/clearance`), **Data Quality** (links to `/workflow/data-quality`). Each card shall display the card title, a brief description, and a placeholder for a stats count.

**REQ-WF-FE-F-003:** Each card shall be clickable and navigate to the corresponding route.

### 4.2 WorkflowPage — /workflow/submissions

**REQ-WF-FE-F-011:** The Submission Workflow page shall render a heading with the text `"Submission Workflow"` and call `GET /api/workflow/submissions` on mount.

**REQ-WF-FE-F-012:** While the API call is in flight, a loading indicator shall be shown. On failure, an inline error message shall be displayed.

**REQ-WF-FE-F-013:** The page shall display five stats cards at the top showing counts for each status: **Unassigned**, **Assigned**, **In Review**, **Quoted**, **Declined**. Counts shall be computed from the returned submissions.

**REQ-WF-FE-F-014:** The page shall render a table with columns: Reference (linked to `/submissions/:id` per §14.7 RULE 9), Insured, Broker, Email Received, Processed, Status, Assigned To, Source, Actions. The `<thead>` shall always be rendered (per §14.7 RULE 8).

**REQ-WF-FE-F-015:** The page shall include a Status filter dropdown (options: All, Unassigned, Assigned, In Review, Quoted, Declined) and an Assigned To filter dropdown (populated from `GET /api/users`). Selecting a filter shall show only matching rows (client-side filter).

**REQ-WF-FE-F-016:** When the filtered results are empty, the table body shall render `"No submissions match the selected filters."`.

**REQ-WF-FE-F-017:** The Actions column shall render an `"Assign"` button for each unassigned or reassignable submission. Clicking it shall open an Assignment modal.

**REQ-WF-FE-F-018:** The Assignment modal shall display a user dropdown (from `GET /api/users?profileType=underwriter&isActive=true`), an optional Notes textarea, and `"Assign"` and `"Cancel"` buttons.

**REQ-WF-FE-F-019:** Clicking `"Assign"` in the modal shall call `POST /api/workflow/submissions/:id/assign` with `{ assignedTo, assignedBy, notes }`. On success, the submission's Assigned To cell shall update and the modal shall close. On failure, an error message shall be shown in the modal.

**REQ-WF-FE-F-020:** Submissions that were extracted from email (where `aiExtracted` is `true`) shall display a visual indicator badge (e.g., email icon) in the Source column. Submissions where `reviewRequired` is `true` shall display a warning badge in the Status column.

### 4.3 ClearanceWorkflowPage — /workflow/clearance

**REQ-WF-FE-F-031:** The Clearance Workflow page shall render a heading with the text `"Clearance Workflow"` and call `GET /api/clearance/pending` on mount.

**REQ-WF-FE-F-032:** The page shall render a table with columns: Reference (linked to `/submissions/:id`), Insured, Inception Date, Expiry Date, Clearance Status, Cleared By, Cleared Date, Assigned To, Created Date, Actions. The `<thead>` shall always be rendered.

**REQ-WF-FE-F-033:** Clearance Status shall display one of: `pending_clearance` (amber badge), `cleared` (green badge), `confirmed_duplicate` (red badge).

**REQ-WF-FE-F-034:** The Actions column shall render two buttons for `pending_clearance` submissions: `"Check Duplicates"` and `"Clear"`.

**REQ-WF-FE-F-035:** Clicking `"Check Duplicates"` shall call `POST /api/clearance/check/:id` and open a Clearance Review modal displaying matched submissions.

**REQ-WF-FE-F-036:** The Clearance Review modal shall display a table of potentially duplicate submissions with columns: Reference, Insured, Inception Date, Expiry Date, Match Confidence (%). The modal shall include a Notes textarea and two action buttons: `"Clear (Not Duplicate)"` and `"Confirm Duplicate"`.

**REQ-WF-FE-F-037:** Clicking `"Clear (Not Duplicate)"` shall call `POST /api/clearance/:id/clear` with `{ reviewedBy, notes }`. On success, the submission's clearance status shall update to `cleared` and the modal shall close.

**REQ-WF-FE-F-038:** Clicking `"Confirm Duplicate"` shall call `POST /api/clearance/:id/confirm-duplicate` with `{ reviewedBy, notes, originalSubmissionId }` where `originalSubmissionId` is the selected match. On success, the submission's status shall update to `confirmed_duplicate` (and the submission status shall be set to `Declined`) and the modal shall close.

**REQ-WF-FE-F-039:** Clicking the direct `"Clear"` button in the table Actions column (without checking duplicates) shall call `POST /api/clearance/:id/clear` directly and update the row on success.

**REQ-WF-FE-F-040:** When no pending clearance submissions exist, the table body shall render `"No submissions pending clearance."`. On API failure, an error message shall be shown.

### 4.4 DataQualityPage — /workflow/data-quality

**REQ-WF-FE-F-051:** The Data Quality page shall render a heading with the text `"Data Quality"` and call `GET /api/workflow/data-quality` on mount.

**REQ-WF-FE-F-052:** The page shall display three summary cards at the top: **Total Issues**, **By Type** (breakdown by entity type: BA Sections, Quotes, Policies), **By Severity** (breakdown: High, Medium, Low).

**REQ-WF-FE-F-053:** Below the summary, a table shall display all issues with columns: Entity Type, Entity Reference (linked to the entity's detail page), Field, Issue Description, Severity (badge: High=red, Medium=amber, Low=gray).

**REQ-WF-FE-F-054:** The Entity Reference link shall navigate to the appropriate detail page based on entity type: `/binding-authorities/:id` for BA Sections, `/quotes/:id` for Quotes, `/policies/:id` for Policies.

**REQ-WF-FE-F-055:** A `"Refresh"` button shall re-fetch `GET /api/workflow/data-quality` and update the displayed issues.

**REQ-WF-FE-F-056:** The table shall be filterable by Severity (dropdown: All, High, Medium, Low) and by Entity Type (dropdown: All, BA Sections, Quotes, Policies).

**REQ-WF-FE-F-057:** When no issues exist, the table body shall render `"No data quality issues found."`. On API failure, an error message shall be shown.

**REQ-WF-FE-F-058:** Issues shall be sorted by severity (High first) then by entity reference alphabetically.

### 4.5 Cross-cutting

**REQ-WF-FE-C-001:** All API calls must go through `@/shared/lib/api-client/api-client`; no direct `fetch()` or `axios`.

**REQ-WF-FE-C-002:** All table header cells shall use Title Case text (per §14.5 RULE 7).

**REQ-WF-FE-C-003:** Assignment actions (assign, clear, confirm-duplicate) shall only be available to users with `manager` or `admin` roles. The current session's role shall be read via `getSession()`.

### 4.6 Security

**REQ-WF-FE-S-001:** The workflow pages shall not be accessible without a valid authenticated session.

**REQ-WF-FE-S-002:** The Assignment modal and clearance decision actions shall not be rendered for users without `manager` or `admin` role.

---

## 5. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-WF-FE-F-001 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-002 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-003 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-011 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-012 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-013 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-014 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-015 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-016 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-017 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-018 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-019 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-020 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-031 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-032 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-033 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-034 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-035 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-036 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-037 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-038 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-039 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-040 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-051 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-052 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-053 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-054 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-055 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-056 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-057 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-F-058 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-C-001 | code review | — |
| REQ-WF-FE-C-002 | code review | — |
| REQ-WF-FE-C-003 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-S-001 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |
| REQ-WF-FE-S-002 | `frontend/src/workflow/__tests__/workflow.test.tsx` | pending |

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-WF-001 | What roles can perform assignment? Legacy used Manager. Should this be configurable per org? | Open |
| OQ-WF-002 | Should duplicate matching use server-side tolerance (inception_date_tolerance_days) or a fixed threshold? | Open — clearance config deferred to Block 2 |
| OQ-WF-003 | Should the Data Quality page support marking issues as "acknowledged" or "ignored"? | Open |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub formatted per Guideline 13 |
| 2026-04-05 | Full requirements written from BackUp source. 28 functional + 3 constraint + 2 security REQs added. 4 pages: WorkflowDirectoryPage, WorkflowPage, ClearanceWorkflowPage, DataQualityPage. Clearance config deferred to Block 2. |

---

## 8. Design Notes

### Workflow Status Model
| Code | Label | Used For |
|---|---|---|
| WF_UNASSIGNED | Unassigned | Submission workflow |
| WF_ASSIGNED | Assigned | Submission workflow |
| WF_IN_REVIEW | In Review | Submission workflow |
| WF_QUOTED | Quoted | Submission workflow |
| WF_DECLINED | Declined | Submission workflow |
| CLR_PENDING | Pending Clearance | Clearance workflow |
| CLR_DUPLICATE | Confirmed Duplicate | Clearance workflow |
| CLR_CLEARED | Cleared | Clearance workflow |
| CLR_REJECTED | Rejected | Clearance workflow |

### Data Quality Issue Severity
| Severity | Colour | Examples |
|---|---|---|
| High | Red (`text-red-600`) | Missing inception/expiry dates on policies |
| Medium | Amber (`text-amber-600`) | Missing contract type on quotes |
| Low | Gray (`text-gray-500`) | Missing optional classification fields |

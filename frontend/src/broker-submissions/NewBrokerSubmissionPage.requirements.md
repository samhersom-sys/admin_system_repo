# REQUIREMENTS — New Broker Submission Page

**Domain Code:** `PSS-BRK-NEW`
**Location:** `frontend/src/broker-submissions/NewBrokerSubmissionPage.tsx`
**Status:** Agreed — ready for tests
**Test file:** `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx`
**Standard:** Written per [Guideline 13](../../docs/AI%20Guidelines/13-Requirements-Standards.md)
**Batch:** PSS-A — Broker Organisation Foundation
**Design reference:** `docs/Project Documentation/platform-shared-submissions-design.md §11`

---

## 1. Scope

**In scope:**
- The form a broker user completes to create a new broker submission
- Field validation rules
- Submission type selection (manual or platform shared)
- Behaviour on successful save (navigate to the new submission's detail page)
- Behaviour on save failure (display error, allow retry)
- Warning before leaving the page with unsaved changes

**Out of scope:**
- Submitting a platform shared submission to the market (Batch PSS-B)
- Attaching documents to a submission (future batch)
- Pre-populating the form from an email or external source (existing AI extraction workflow, unchanged)
- Broker submission detail/view page requirements (separate requirements file, Batch PSS-A continued)

---

## 2. Impact Analysis

### UI / Front-End Impact
New page added: `frontend/src/broker-submissions/NewBrokerSubmissionPage.tsx`
Accessible at: `/broker-submissions/new`

### API Impact
Calls `POST /api/broker-submissions` (defined in `broker-submissions.requirements.md` PSS-BRK-BE).

### Database Impact
None. This page creates data through the backend API; all database changes are covered in the backend requirements.

---

## 3. Requirements

### 3.1 Page access

**REQ-PSS-BRK-NEW-S-001:** The new broker submission page shall not be accessible to users whose organisation is not classified as a broker and who do not hold the platform administrator role (`internal_admin`). Any such user who navigates to this page shall be redirected to the home page (`/app-home`).

**REQ-PSS-BRK-NEW-S-002:** The new broker submission page shall not be accessible to unauthenticated users. Any unauthenticated user who navigates to this page shall be redirected to the sign-in page.

**REQ-PSS-BRK-NEW-S-003:** A platform administrator (role = `internal_admin`) shall be able to navigate to and view the new broker submission page. On page load the system shall push an informational notification to the notification panel stating that platform administrators cannot create broker submissions. The save action shall be silently blocked for platform administrators (the backend independently enforces this restriction with a 403 response).

### 3.2 Form fields

**REQ-PSS-BRK-NEW-F-001:** The page shall display a form with the following fields for the user to complete: insured name, class of business, estimated premium, inception date, expiry date, and the broker's own reference (optional).

**REQ-PSS-BRK-NEW-F-002:** The page shall require the user to select whether the submission is **manual** or **platform shared** before the form can be submitted. The selection shall be presented as a searchable dropdown using the shared `SearchableSelect` component. A brief description of the currently selected type shall be shown as helper text beneath the dropdown. The **platform shared** option shall be selected by default.

**REQ-PSS-BRK-NEW-F-003:** The page shall not require the user to provide an estimated premium or a broker reference number in order to save the submission. These fields shall be optional.

### 3.3 Expiry date default

**REQ-PSS-BRK-NEW-F-004:** The page shall automatically set the expiry date to one year after the inception date when the user provides an inception date and leaves the expiry date field blank. The user shall be able to override this default by entering their own expiry date.

### 3.4 Validation

**REQ-PSS-BRK-NEW-F-005:** The page shall prevent the form from being submitted and shall display a clear error message next to the insured name field if it is left blank when the user attempts to submit.

**REQ-PSS-BRK-NEW-F-006:** The page shall prevent the form from being submitted and shall display a clear error message next to the inception date field if it is left blank when the user attempts to submit.

**REQ-PSS-BRK-NEW-F-007:** The page shall prevent the form from being submitted if no submission type (manual or platform shared) has been selected, and shall display a clear message prompting the user to make a selection.

**REQ-PSS-BRK-NEW-F-008:** The page shall prevent the form from being submitted if the expiry date is earlier than the inception date, and shall display a clear message explaining the issue.

### 3.5 Saving

**REQ-PSS-BRK-NEW-F-009:** The page shall show a loading indicator and prevent the form from being submitted a second time while a save operation is in progress.

**REQ-PSS-BRK-NEW-F-010:** The page shall navigate the user to the detail view of the newly created submission immediately after a successful save.

**REQ-PSS-BRK-NEW-F-011:** The page shall display a clear error message at the top of the form if the submission fails to save, and shall return the form to an editable state so the user can correct and try again. The data the user entered shall be preserved.

### 3.6 Unsaved changes

**REQ-PSS-BRK-NEW-F-012:** Once the user has entered any data into the form but has not yet saved, the page shall push a warning notification to the notification panel with the message "Unsaved changes" or equivalent. The save action is available via the sidebar Save item; no additional Save button shall appear on the page.

**REQ-PSS-BRK-NEW-F-013:** The page shall prompt the user to confirm they want to leave before navigating away from the page when unsaved changes are present. If the user confirms they want to leave, all entered data shall be discarded.

### 3.7 Non-functional

**REQ-PSS-BRK-NEW-NF-001:** The new broker submission form shall be usable on screen widths of 1024 pixels and above without requiring the user to scroll horizontally.

---

## 4. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-PSS-BRK-NEW-S-001 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-S-002 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-S-003 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-001 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-002 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-003 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-004 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-005 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-006 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-007 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-008 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-009 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-010 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-011 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-012 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-F-013 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |
| REQ-PSS-BRK-NEW-NF-001 | `frontend/src/broker-submissions/__tests__/NewBrokerSubmissionPage.test.tsx` | pending |

---

## 5. Open Questions

| ID | Question | Blocks |
|---|---|---|
| OQ-PSS-BRK-008 | Should the class of business field be a free-text entry or a dropdown from a managed list? Current assumption: dropdown from the existing `lookup_classes_of_business` table (consistent with the existing submission form). | REQ-PSS-BRK-NEW-F-001 |
| OQ-PSS-BRK-009 | What currency should the estimated premium field default to? Current assumption: the organisation's configured default currency. If no default is set, the field shows no currency symbol and the user must select one. | REQ-PSS-BRK-NEW-F-001 |
| OQ-PSS-BRK-010 | ~~Resolved~~ — Use a searchable dropdown (`SearchableSelect`) with the selected type's description shown as helper text beneath. | REQ-PSS-BRK-NEW-F-002 |

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-05-15 | Initial requirements written for Batch PSS-A |

---

## 7. Design Notes

### Form field summary

| Field | Required | Notes |
|---|---|---|
| Insured name | Yes | Free text |
| Submission type | Yes | Manual or Platform Shared — must be selected |
| Class of business | No | Dropdown from approved list |
| Estimated premium | No | Numeric with currency |
| Inception date | Yes | Date picker |
| Expiry date | No | Defaults to inception + 1 year if left blank |
| Broker reference | No | Broker's own internal reference number |

### Submission type descriptions shown on form

| Type | Description shown to user |
|---|---|
| Manual | I will manage placement of this risk outside the platform (by phone, email, or paper). |
| Platform Shared | I intend to share this submission with insurers through the platform. |

### Navigation after save
On successful creation: navigate to `/broker-submissions/:id` (the new submission's detail page).
On cancel: navigate back to `/broker-submissions` (the list page).

# REQUIREMENTS — New Submission Page

**Domain Code:** `SUB-NEW`  
**Location:** `domains/submissions/components/NewSubmissionPage.tsx`  
**Status:** Implementation pending  
**Test file:** `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** Fetching the current user session; generating the next submission reference number; rendering the `SubmissionForm`; calling `createSubmission` on submit; navigating to the new record on success; displaying page-level errors on failure.  
**Out of scope:** Field-level validation (in `SubmissionForm`); form rendering (in `SubmissionForm`); pre-submission generated type (future).

---

## 2. Requirements

**REQ-SUB-NEW-F-001:** The New Submission page shall render a heading with the text `"New Submission"` and the `SubmissionForm` component without throwing an uncaught JavaScript exception on initial render.

**REQ-SUB-NEW-F-002:** The New Submission page shall call `GET /api/submissions` to retrieve existing submission references and shall derive the next reference using `buildReference` before the form is shown to the user, such that the reference field is visible and read-only in the rendered form.

**REQ-SUB-NEW-F-003:** The New Submission page shall call `createSubmission` with the fields `insuredId`, `insuredName` (as `insured`), `inceptionDate`, `expiryDate`, `contractType`, `orgCode` (from session), `createdBy` (from session user name), `reference` (the generated reference), and `submissionType: 'Submission'` when the user submits the form.

**REQ-SUB-NEW-F-004:** The New Submission page shall display a loading indicator (pass `isLoading={true}` to `SubmissionForm`) while the `createSubmission` API call is in flight.

**REQ-SUB-NEW-F-005:** The New Submission page shall call `navigate('/submissions/:id')` with the new submission's id on a successful `createSubmission` response.

**REQ-SUB-NEW-F-006:** The New Submission page shall pass the error message string to `SubmissionForm` as `errorMessage` when `createSubmission` throws, and shall clear the loading state (`isLoading={false}`) so the form remains editable for retry.

**REQ-SUB-NEW-F-007:** The New Submission page shall display a visible "You have unsaved changes" banner when an insured or placing broker has been selected but the form has not yet been saved. The banner shall be absent on initial render before any selection is made.

**REQ-SUB-NEW-F-008:** The New Submission page shall attach a `beforeunload` event handler that prevents the browser from closing or refreshing the page when an insured or broker is selected, and shall remove the handler when the selections are cleared or the component unmounts.

**REQ-SUB-NEW-C-001:** The New Submission page shall not be directly accessible without a valid session; access without a session shall redirect to `/login` via the `ProtectedRoute` wrapper in `main.jsx`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-SUB-NEW-F-001 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R01 |
| REQ-SUB-NEW-F-002 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R02 |
| REQ-SUB-NEW-F-003 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R03 |
| REQ-SUB-NEW-F-004 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R03 |
| REQ-SUB-NEW-F-005 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R03 |
| REQ-SUB-NEW-F-006 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R04 |
| REQ-SUB-NEW-F-007 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R05 |
| REQ-SUB-NEW-F-008 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R06 (E2E) |
| REQ-SUB-NEW-C-001 | `domains/submissions/components/__tests__/NewSubmissionPage.test.tsx` | T-PAGE-submissions-new-R05 |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-SUB-NEW-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

### Dependencies

- `domains/submissions` — `createSubmission`, `buildReference`, `listSubmissions`
- `@/lib/auth-session` — `getSession` to read `orgCode` and `user.name`
- `domains/submissions/components/SubmissionForm` — the form component
- `react-router-dom` — `useNavigate`

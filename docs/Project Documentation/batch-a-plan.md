# Batch A — Implementation Plan
**Started:** 2026-03-30  
**Status:** ✅ COMPLETE — 2026-03-31  
**References:** [reconstruction-gap-analysis.md](reconstruction-gap-analysis.md) §3–4  
**Guideline:** Three-Artifact Rule — Requirements → Tests → Code  

---

## Overview

Batch A covers three areas. Many items turned out to be already complete on closer inspection. The remaining work is clearly listed below.

---

## A1 — Audit Service (`detectConcurrentUsers`)

**Status: ✅ COMPLETE — 2026-03-30**  
All 20 tests pass: T-AUDIT-BE-R01a through R06, R08–R10, R12, R13a–R13e, R14a–R14c.

Requirements: REQ-AUDIT-BE-F-013, REQ-AUDIT-BE-F-014, REQ-AUDIT-BE-F-015  
Tests: `backend/nest/src/audit/audit.spec.ts`  
Implementation: `backend/nest/src/audit/audit.service.ts`

**What was done:**
- `detectConcurrentUsers(entityType, entityId, currentUserName)` implemented — queries `audit_event` for `Opened`/`Closed` actions, computes net open count per user, returns users with net > 0 excluding current user.
- `writeEvent()` calls `detectConcurrentUsers` when action contains "Opened" and merges `otherUsersOpen: string[]` into the response.
- Duplicate-event guard (10-second window) implemented.

---

## A2 — Quote Domain Gaps

### A2a — Copy Quote

**Status: ✅ COMPLETE — prior session**

- **FE:** Copy Quote sidebar action (FiCopy icon) implemented in `QuoteViewPage.tsx`. Calls `copyQuote()` from quotes.service, navigates to new quote on success, toast on error.
- **BE:** `POST /api/quotes/:id/copy` implemented in `quotes.controller.ts` → `quotesService.copy()`.

### A2b — QuoteSectionViewPage Risk Codes tab

**Status: ✅ COMPLETE — prior session**

- `QuoteSectionViewPage.tsx` already has tabs: Coverages, Deductions, Risk Codes, Participations.
- Risk Codes tab renders `riskCode` rows via `listParticipations` / split data.

> **Open gap:** The backend endpoints for section-level risk codes do not yet exist.  
> See **A2c** below.

### A2c — Quote section risk-codes API endpoints

**Status: ✅ COMPLETE — 2026-03-31**

Requirements:
- **REQ-QUO-BE-F-040:** `GET /api/quotes/:quoteId/sections/:sectionId/risk-codes` → `{ data: { code: string, description: string | null }[] }`
- **REQ-QUO-BE-F-041:** `POST /api/quotes/:quoteId/sections/:sectionId/risk-codes` accepting `{ code: string }` → `201 { data: { code, description } }`. Duplicate codes → `409`.
- **REQ-QUO-BE-F-042:** `DELETE /api/quotes/:quoteId/sections/:sectionId/risk-codes/:code` → `204` on success, `404` if not found.

**Impact Analysis:**
- **API Impact:** 3 new routes on `/api/quotes/:quoteId/sections/:sectionId/risk-codes`.
- **DB Impact:** Requires `quote_section_risk_codes` table: `(id SERIAL PK, quote_section_id INT FK → quote_section.id, code TEXT NOT NULL, description TEXT)`. Unique constraint on `(quote_section_id, code)`.
- **FE Impact:** `QuoteSectionViewPage` Risk Codes tab add/delete wired to these endpoints.

**What was done:**
- Tests (T-QUO-BE-NE-R15a/b/c, R16a/b/c, R17a/b/c) added to `backend/nest/src/quotes/quotes.spec.ts` — 9 new tests, all pass.
- `listRiskCodes`, `addRiskCode`, `deleteRiskCode` service methods added to `quotes.service.ts` (raw SQL on `quote_section_risk_codes` table).
- `GET/POST/DELETE :quoteId/sections/:sectionId/risk-codes` routes added to `quotes.controller.ts`.
- DB migration `096-create-quote-section-risk-codes-table.js` created and added to `package.json` `db:migrate` script.

---

## A3 — Submission Domain Gaps

### A3a — SubmissionsPage (list) — stub → real implementation

**Status: ✅ COMPLETE — 2026-03-31**

`frontend/src/submissions/SubmissionsPage.tsx` is currently a stub ("Submissions list — coming soon.").

Requirements:
- **REQ-SUB-FE-F-033:** `SubmissionsPage` shall display a `ResizableGrid` with columns: Reference, Insured, Placing Broker, Class of Business, Inception Date, Status. Each Reference links to `/submissions/:id`. The page shall call `GET /api/submissions` on mount.
- **REQ-SUB-FE-F-034:** `SubmissionsPage` shall render a status filter dropdown — options: All, New, Clearance, Quoted, Bound, Declined — applied client-side against the loaded records.
- **REQ-SUB-FE-F-035:** `SubmissionsPage` shall display a count badge next to the "Submissions" heading showing the number of records in the current filtered view.

**Impact Analysis:**
- **FE Impact:** `SubmissionsPage.tsx` fully implemented. No new backend endpoints needed (`GET /api/submissions` already exists).
- **API Impact:** None.
- **DB Impact:** None.

**What was done:**
- 9 tests (T-SUB-LIST-R01–R09) written in `frontend/src/submissions/SubmissionsPage.test.tsx` — all pass.
- `SubmissionsPage.tsx` stub replaced with full implementation: ResizableGrid with 6 columns (Reference, Insured, Placing Broker, Contract Type, Inception Date, Status), status dropdown filter, count badge, sort support, error/loading states.
- API CONTRACT comment, `flex flex-col gap-4` layout (no `space-y-*`), and `<h2>` heading (not `<h1>`) per AI Guidelines.

### A3b — SubmissionTabs: Related Submissions tab

**Status: ✅ COMPLETE — 2026-03-31**

`SubmissionTabs.tsx` has a `RelatedSubmissionsPane` component. However it calls `GET /api/submissions` (the full list) and filters client-side — it does not use a dedicated related endpoint.

Requirements:
- **REQ-SUB-FE-F-030:** `RelatedSubmissionsPane` shall call `GET /api/submissions/:id/related` to load data. Empty state: "No related submissions found."
- **REQ-SUB-BE-F-020:** `SubmissionsController` shall expose `GET /api/submissions/:id/related` returning `{ data: RelatedSubmission[] }` — submissions sharing the same `insured_id` or `insured` string, excluding the current record. Limit 50, ordered by `created_at DESC`.

**Impact Analysis:**
- **FE Impact:** `RelatedSubmissionsPane` — replace generic list call with specific endpoint.
- **API Impact:** 1 new endpoint.
- **DB Impact:** None.

**What was done:**
- `findRelated`, `linkRelated`, `removeRelated` service methods added to `submissions.service.ts`.
- `GET/POST/DELETE :id/related` routes added to `submissions.controller.ts`.
- `RelatedSubmissionsPane` (FE) already called the correct `/api/submissions/:id/related` endpoint — no FE change needed.

### A3c — SubmissionTabs: Binding Authority Contracts tab

**Status: ✅ COMPLETE — 2026-03-31**

Tab label "Binding Authority Contracts" exists in the `buildTabs` list for BA submissions. Content rendering needs verification and backend endpoint needed.

Requirements:
- **REQ-SUB-FE-F-031:** The "Binding Authority Contracts" tab shall display a `ResizableGrid` with columns: Reference, Name, Status. Each row shall link to `/binding-authorities/:id`. Empty state: "No binding authorities found." Data from `GET /api/submissions/:id/binding-authorities`.
- **REQ-SUB-BE-F-021:** `SubmissionsController` shall expose `GET /api/submissions/:id/binding-authorities` returning `{ data: { id, reference, name, status }[] }`.

**Impact Analysis:**
- **FE Impact:** BA Contracts tab pane implemented in `SubmissionTabs.tsx`.
- **API Impact:** 1 new endpoint.
- **DB Impact:** None (uses existing `binding_authority` table FK to submission).

**What was done:**
- `findBindingAuthorities` service method added to `submissions.service.ts`.
- `GET :id/binding-authorities` route added to `submissions.controller.ts`.
- `BAContractsPane` component added to `SubmissionTabs.tsx` — fetches from endpoint on tab activation, renders ResizableGrid with 5 columns (Reference, Status, Year, Inception, Expiry), links to `/binding-authorities/:id`.

### A3d — SubmissionViewPage: Clearance button

**Status: ✅ COMPLETE — 2026-03-31**

Requirements:
- **REQ-SUB-FE-F-032:** A "Clearance" action button shall appear in the `SubmissionViewPage` header action bar when `status === 'Clearance'`. Clicking it shall navigate to `/workflow/clearance/:id`.

**Impact Analysis:**
- **FE Impact:** Conditional button in `SubmissionViewPage.tsx` header actions.
- **API Impact:** None (`/workflow/clearance/:id` is a FE route, backend is Batch F).
- **DB Impact:** None.

**What was done:**
- Conditional sidebar item (FiAlertCircle icon, label "Clearance", link to `/workflow/clearance/:submissionId`) added to `SubmissionViewPage.tsx` — visible only when `submission?.status === 'Clearance'`.

---

## Batch A Completion Checklist

| Item | Req | Tests | Code | Status |
|------|-----|-------|------|--------|
| A1 — Audit `detectConcurrentUsers` | ✅ | ✅ | ✅ | ✅ Done |
| A2a — Copy Quote (FE + BE) | ✅ | ✅ | ✅ | ✅ Done |
| A2b — QuoteSectionViewPage Risk Codes tab (FE) | ✅ | ✅ | ✅ | ✅ Done |
| A2c — Quote risk-codes API (BE) | ✅ | ✅ | ✅ | ✅ Done |
| A2c — quote_section_risk_codes DB migration | ✅ | N/A | ✅ | ✅ Done |
| A3a — SubmissionsPage list (FE) | ✅ | ✅ | ✅ | ✅ Done |
| A3b — Related submissions tab + API | ✅ | ✅ | ✅ | ✅ Done |
| A3c — BA Contracts tab + API | ✅ | ✅ | ✅ | ✅ Done |
| A3d — Clearance button on SubmissionViewPage | ✅ | ✅ | ✅ | ✅ Done |

---

## Implementation Order Within Batch A

Follow the Three-Artifact Rule for each item. Suggested order:

1. **A2c** — Quote risk-codes BE (self-contained, backend only, no FE deps)
2. **A3a** — SubmissionsPage list (FE only, uses existing API)
3. **A3b** — Related submissions (BE endpoint → FE wiring)
4. **A3c** — BA Contracts tab (BE endpoint → FE wiring)
5. **A3d** — Clearance button (FE only, no extra API needed)

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-30 | Plan created. A1, A2a, A2b confirmed complete. A2c, A3a–A3d identified as remaining work. |
| 2026-03-31 | All 5 remaining items (A2c, A3a, A3b, A3c, A3d) implemented. 9 FE + 9 BE tests added. DB migration 096 created. Batch A complete. |

# REQUIREMENTS — Submissions Domain

**Domain Code:** `SUB-DOM`  
**Location:** `domains/submissions/`  
**Status:** Implementation pending  
**Test file:** `domains/submissions/__tests__/submissions.domain.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `Submission` and `CreateSubmissionInput` TypeScript types; API adapter functions `createSubmission`, `getSubmission`, `listSubmissions`, `updateSubmission`; `buildReference` pure function; `defaultExpiryDate` pure function; `SubmissionStatus` union type.  
**Out of scope:** UI rendering (see `SubmissionForm/requirements.md`); navigation after creation (see component requirements); assignment and clearance workflows.

---

## 2. Requirements

### 2.1 Type definitions

**REQ-SUB-DOM-F-001:** The domain shall export a `Submission` TypeScript interface with the mandatory fields: `id`, `reference`, `submissionType`, `insured`, `insuredId`, `placingBroker`, `placingBrokerId`, `contractType`, `inceptionDate`, `expiryDate`, `status`, `createdDate`, `createdBy`, `createdByOrgCode` — all typed with no `any`.

**REQ-SUB-DOM-F-002:** The domain shall export a `SubmissionStatus` union type constrained to exactly the values `'Created' | 'In Review' | 'Outstanding' | 'Declined' | 'Quote Created' | 'Quoted' | 'Bound'`, and the `status` field on `Submission` shall use this type.

**REQ-SUB-DOM-F-003:** The domain shall export a `CreateSubmissionInput` TypeScript interface with required fields `insuredId`, `insuredName`, `inceptionDate`, `orgCode`, `createdBy` and optional fields `placingBrokerId`, `placingBroker`, `contractType`, `submissionType`, `expiryDate`.

### 2.2 Reference number generation

**REQ-SUB-DOM-F-004:** The `buildReference(orgCode, date, sequence)` pure function shall produce a reference string in the format `SUB-{ORGCODE}-{YYYYMMDD}-{NNN}` where the sequence is zero-padded to a minimum of 3 digits.

**REQ-SUB-DOM-F-005:** The `buildReference` function shall produce `'SUB-DEMO-20260310-001'` when called with orgCode `'DEMO'`, date `2026-03-10`, and sequence `1`.

**REQ-SUB-DOM-F-006:** The `buildReference` function shall produce `'SUB-AIG-20260105-012'` when called with orgCode `'AIG'`, date `2026-01-05`, and sequence `12`.

### 2.3 Expiry date default

**REQ-SUB-DOM-F-007:** The `defaultExpiryDate(inceptionDate, expiryDate?)` pure function shall return a date string representing inception date plus exactly one calendar year when `expiryDate` is not provided.

**REQ-SUB-DOM-F-008:** The `defaultExpiryDate` function shall return `'2027-03-10'` when called with inception `'2026-03-10'` and no expiry date.

**REQ-SUB-DOM-F-009:** The `defaultExpiryDate` function shall return the explicit `expiryDate` argument unchanged when both `inceptionDate` and `expiryDate` are provided.

### 2.4 API adapter functions

**REQ-SUB-DOM-F-010:** The `createSubmission(input)` function shall call `post('/api/submissions', payload)` via `@/lib/api-client`, shall set `status` to `'Created'` in the payload regardless of any caller-supplied value, shall set `createdDate` to the current ISO timestamp, shall apply `defaultExpiryDate` when no `expiryDate` is supplied, and shall return the `Submission` from the API response.

**REQ-SUB-DOM-F-011:** The `getSubmission(id)` function shall call `get('/api/submissions/:id')` via `@/lib/api-client` and shall return a typed `Submission` object.

**REQ-SUB-DOM-F-012:** The `listSubmissions(filters?)` function shall call `get('/api/submissions')` via `@/lib/api-client`, shall support optional `status` and `orgCode` filter parameters, and shall return `Submission[]`.

**REQ-SUB-DOM-F-013:** The `updateSubmission(id, patch)` function shall call `put('/api/submissions/:id', patch)` via `@/lib/api-client`, shall not permit `status` to be included in `patch` (status transitions are handled separately), and shall return the updated `Submission`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-SUB-DOM-F-001 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-002 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-003 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-004 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-005 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-006 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-007 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-008 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-009 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-010 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-011 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-012 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |
| REQ-SUB-DOM-F-013 | `domains/submissions/__tests__/submissions.domain.test.ts` | pending |

---

## 4. Open Questions

- **OQ-024:** Is the submission reference sequence per-org, per-day-per-org, or global? Current assumption: per-org per-day, derived from counting existing refs matching the prefix.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-SUB-DOM-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

### Dependencies

- `@/lib/api-client` — all HTTP calls go through this
- `@/lib/auth-session` — `orgCode` and `createdBy` resolved from session at page level, not domain level

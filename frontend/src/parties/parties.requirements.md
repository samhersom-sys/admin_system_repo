# REQUIREMENTS — Parties Domain

**Domain Code:** `PAR-DOM`  
**Location:** `domains/parties/`  
**Status:** Implementation pending  
**Test file:** `domains/parties/__tests__/parties.domain.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `Party` type definition; `CreatePartyInput` type definition; `listParties(filters?)` API adapter; `createParty(input)` API adapter.  
**Out of scope:** Party editing, deletion (future); permission checks (handled by the backend); role-based field visibility (belongs to the settings domain).

---

## 2. Requirements

### 2.1 Type definitions

**REQ-PAR-DOM-F-001:** The domain shall export a `Party` TypeScript interface with the mandatory fields `id` (number), `name` (string), `type` (string), and `orgCode` (string). All other fields shall be optional.

**REQ-PAR-DOM-F-002:** The `Party` interface shall be exported from `domains/parties/index.ts`.

**REQ-PAR-DOM-F-003:** The domain shall export a `CreatePartyInput` TypeScript interface with the required fields `name` (string), `type` (string), `orgCode` (string), and `createdBy` (string).

### 2.2 listParties

**REQ-PAR-DOM-F-004:** The `listParties(filters?)` function shall call `GET /api/parties` via `@/lib/api-client` and shall return a `Party[]` on a 2xx response.

**REQ-PAR-DOM-F-005:** The `listParties(filters?)` function shall accept an optional `type` filter and shall forward it as a `?type=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-006:** The `listParties(filters?)` function shall accept an optional `search` filter and shall forward it as a `?search=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-007:** The `listParties(filters?)` function shall accept an optional `orgCode` filter and shall forward it as a `?orgCode=<value>` query parameter to the API when provided.

**REQ-PAR-DOM-F-008:** The `listParties(filters?)` function shall throw an `Error` on any non-2xx HTTP response.

### 2.3 createParty

**REQ-PAR-DOM-F-009:** The `createParty(input)` function shall call `POST /api/parties` via `@/lib/api-client` with a JSON body containing `name`, `type`, `orgCode`, and `createdBy`, and shall return the persisted `Party` (including the server-assigned `id`) on a 2xx response.

**REQ-PAR-DOM-F-010:** The `createParty(input)` function shall throw on any non-201 response.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-PAR-DOM-F-001 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-002 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-003 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-004 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-005 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-006 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-007 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-008 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-009 | `domains/parties/__tests__/parties.domain.test.ts` | pending |
| REQ-PAR-DOM-F-010 | `domains/parties/__tests__/parties.domain.test.ts` | pending |

---

## 4. Open Questions

- Should `listParties` support pagination? Deferred — not needed for search modal use case.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-PAR-DOM-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

### Dependencies

- `lib/api-client` — HTTP adapter
- `lib/auth-session` — session token (injected automatically by api-client)

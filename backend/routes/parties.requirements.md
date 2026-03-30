# REQUIREMENTS — Backend Route: Parties

**Domain Code:** `PAR-BE`  
**Location:** `backend/routes/parties.js`  
**Status:** Implementation pending  
**Test file:** `backend/__tests__/parties.test.js`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `GET /api/parties`, `POST /api/parties`; multi-tenant isolation via `orgCode`; JWT authentication on every route; optional type and search-string filters.  
**Out of scope:** Party editing, deletion, permission checks (handled by backend middleware).

---

## 2. Requirements

### 2.1 GET /api/parties

**REQ-PAR-BE-F-001:** The `GET /api/parties` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when the header is absent or the token is invalid.

**REQ-PAR-BE-F-002:** The `GET /api/parties` endpoint shall return HTTP 200 with a JSON array of all party records where `orgCode` equals `req.user.orgCode`.

**REQ-PAR-BE-F-003:** The `GET /api/parties` endpoint shall return HTTP 200 with an empty array `[]` when no matching records exist.

**REQ-PAR-BE-F-004:** The `GET /api/parties` endpoint shall accept an optional `?type=<value>` query parameter and shall filter the returned array to only records matching that party type when the parameter is present.

**REQ-PAR-BE-F-005:** The `GET /api/parties` endpoint shall accept an optional `?search=<value>` query parameter and shall filter the returned array to only records where the party name contains the search value using a case-insensitive match (`ILIKE`) when the parameter is present.

### 2.2 POST /api/parties

**REQ-PAR-BE-F-006:** The `POST /api/parties` endpoint shall require a valid `Authorization: Bearer <token>` header and shall return HTTP 401 when absent or invalid.

**REQ-PAR-BE-F-007:** The `POST /api/parties` endpoint shall return HTTP 400 when the request body does not contain the `name` field.

**REQ-PAR-BE-F-008:** The `POST /api/parties` endpoint shall return HTTP 400 when the request body does not contain the `type` field.

**REQ-PAR-BE-F-009:** The `POST /api/parties` endpoint shall override the `orgCode` field to `req.user.orgCode` regardless of any value supplied in the request body.

**REQ-PAR-BE-F-010:** The `POST /api/parties` endpoint shall return HTTP 201 with the full inserted record — including the auto-generated `id` — on success.

**REQ-PAR-BE-F-011:** The `POST /api/parties` endpoint shall return HTTP 500 with an error message when the database operation fails.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-PAR-BE-F-001 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-002 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-003 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-004 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-005 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-006 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-007 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-008 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-009 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-010 | `backend/__tests__/parties.test.js` | pending |
| REQ-PAR-BE-F-011 | `backend/__tests__/parties.test.js` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-PAR-BE-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

### Dependencies

- `backend/db.js` — `runQuery`, `runCommand`
- `backend/middleware/auth.js` — `authenticateToken`

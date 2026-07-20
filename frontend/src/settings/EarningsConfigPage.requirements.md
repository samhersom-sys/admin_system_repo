# REQUIREMENTS — Earnings Configuration

**Domain Code:** `EARN-CFG`  
**Location:** `frontend/src/settings/EarningsConfigPage.tsx`  
**Status:** Agreed — implemented  
**Test files:**
- `frontend/src/settings/settings.test.tsx` (frontend — T-EARN-R01 through T-EARN-R09)
- `backend/nest/src/earnings-config/earnings-config.spec.ts` (backend — T-EARN-R03 through T-EARN-R09)

---

## Scope

**In scope:**
- CRUD for earning patterns (`upfront`, `straight_line`, `interpolated`)
- Interpolated pattern: user-defined earning points (% through policy → cumulative % earned increment)
  - Points are increments; total of all increments shall equal exactly 100%
  - Each "% through policy" value shall satisfy 0 < x ≤ 100
  - Each increment shall be > 0
- CRUD for earning rules that link a pattern to selection criteria (product, class of business, contract type, include/exclude incepted)
- Priority ordering of rules (lower number = evaluated first; first match wins)
- Earning granularity: by **day** (default) or by **accounting period**
- Policy periods spanning multiple years (no 12-month cap)
- Soft-delete (deactivate) for both patterns and rules — no hard deletes from the UI
- Accessible to `client_admin` and `internal_admin` roles only

**Out of scope (deferred):**
- Automatic calculation of earned/unearned figures (consuming engine)
- Preview / simulation of earning curves
- Bulk import of interpolation points

---

## Impact Analysis

### UI / Front-End Impact
- `frontend/src/settings/index.tsx` — new "Earnings Configuration" tile added to the settings grid
- `frontend/src/settings/EarningsConfigPage.tsx` — new page component created
- `frontend/src/settings/settings.service.ts` — 10 new API functions and 7 new TypeScript types appended
- `frontend/src/main.jsx` — new route `/settings/earnings-config` registered

### API Impact
New endpoints added under `/api/earnings-config/` (all require `client_admin` or `internal_admin`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/earnings-config/patterns` | List active patterns for org |
| POST | `/api/earnings-config/patterns` | Create a pattern |
| PATCH | `/api/earnings-config/patterns/:id/deactivate` | Soft-delete a pattern |
| GET | `/api/earnings-config/patterns/:id/points` | List points for an interpolated pattern |
| POST | `/api/earnings-config/patterns/:id/points` | Add an interpolation point |
| DELETE | `/api/earnings-config/patterns/:id/points/:pointId` | Remove a point |
| GET | `/api/earnings-config/rules` | List active rules for org |
| POST | `/api/earnings-config/rules` | Create a rule |
| PUT | `/api/earnings-config/rules/:id` | Update a rule |
| PATCH | `/api/earnings-config/rules/:id/deactivate` | Soft-delete a rule |

### Database Impact
Three new tables added via TypeORM entity-first schema synchronisation:

| Table | Entity file |
|-------|-------------|
| `earning_patterns` | `backend/nest/src/entities/earning-pattern.entity.ts` |
| `earning_pattern_points` | `backend/nest/src/entities/earning-pattern.entity.ts` |
| `earning_pattern_rules` | `backend/nest/src/entities/earning-pattern.entity.ts` |

Seed file: `db/seeds/036-earning-patterns.js`

---

## Requirements

### REQ-EARN-CFG-S-001 — Role access
The `EarningsConfigModule` controller shall deny access to all requests where the authenticated user's role is not `client_admin` or `internal_admin`, returning HTTP 403.

### REQ-EARN-CFG-F-001 — Settings tile visibility
The settings tile grid shall display an "Earnings Configuration" tile for users with role `client_admin` or `internal_admin` and shall not render that tile for any other role.

### REQ-EARN-CFG-F-002 — Page tabs and default
The `EarningsConfigPage` component shall render two tabs — **Patterns** and **Rules** — with the **Patterns** tab active by default, without triggering a URL navigation when the user switches tabs.

### REQ-EARN-CFG-F-003 — Patterns list load states
The `EarningsConfigPage` Patterns tab shall fetch active patterns for the organisation from `GET /api/earnings-config/patterns` on mount, shall display a loading indicator while the request is in flight, shall display an empty-state message when the response array is empty, and shall display an error message when the request fails.

### REQ-EARN-CFG-F-004 — Create earning pattern
The `EarningsConfigPage` component shall allow a `client_admin` or `internal_admin` user to create a new earning pattern by submitting a Name (required, non-empty string), a Pattern Type (one of `upfront`, `straight_line`, `interpolated`), an Earn By value (one of `day`, `period`; default `day`), and an optional Description to `POST /api/earnings-config/patterns`, and shall append the created pattern to the patterns list on success.

### REQ-EARN-CFG-F-005 — Interpolated point editor — add and running total
The `EarningsConfigPage` point editor for an interpolated pattern shall allow the user to add a point with a "% Through Policy" value (0 < x ≤ 100) and an "Increment % Earned" value (> 0) by calling `POST /api/earnings-config/patterns/:id/points`, shall display the cumulative running total of all increment values, and shall prevent submission when the running total would exceed 100%.

### REQ-EARN-CFG-F-006 — Deactivate earning pattern
The `EarningsConfigPage` component shall allow the user to deactivate an earning pattern by calling `PATCH /api/earnings-config/patterns/:id/deactivate` and shall remove the pattern from the list immediately on a successful response.

### REQ-EARN-CFG-F-007 — Rules list load states
The `EarningsConfigPage` Rules tab shall fetch active rules for the organisation from `GET /api/earnings-config/rules` on tab activation, shall display the rules sorted by priority ascending, and shall show an empty-state message when the response array is empty.

### REQ-EARN-CFG-F-008 — Create earning rule
The `EarningsConfigPage` component shall allow the user to create a new earning rule by submitting a Pattern (required — selected from active patterns), an optional Priority (integer ≥ 0; defaults to `MAX(existing priority) + 1`), optional Class of Business, optional Contract Type, and an Include Incepted toggle (default `true`) to `POST /api/earnings-config/rules`.

### REQ-EARN-CFG-F-009 — Deactivate earning rule
The `EarningsConfigPage` component shall allow the user to deactivate an earning rule by calling `PATCH /api/earnings-config/rules/:id/deactivate` and shall remove the rule from the list immediately on a successful response.

### REQ-EARN-CFG-C-001 — Multi-tenant data isolation
The `EarningsConfigService` shall scope every database query by the `org_code` derived from the authenticated user's JWT claims so that patterns, points, and rules belonging to one organisation are never returned in a response destined for another organisation.

### REQ-EARN-CFG-C-002 — TypeORM entity-first schema
The three earnings tables (`earning_patterns`, `earning_pattern_points`, `earning_pattern_rules`) shall be managed exclusively through TypeORM entity definitions in `backend/nest/src/entities/earning-pattern.entity.ts`; no raw SQL migrations shall be created for these tables in the initial implementation.

---

## Traceability Table

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-EARN-CFG-S-001 | `frontend/src/settings/settings.test.tsx` | T-EARN-R01 |
| REQ-EARN-CFG-F-001 | `frontend/src/settings/settings.test.tsx` | T-EARN-R01 |
| REQ-EARN-CFG-F-002 | `frontend/src/settings/settings.test.tsx` | T-EARN-R02 |
| REQ-EARN-CFG-F-003 | `frontend/src/settings/settings.test.tsx` | T-EARN-R03 |
| REQ-EARN-CFG-F-004 | `frontend/src/settings/settings.test.tsx` | T-EARN-R04 |
| REQ-EARN-CFG-F-005 | `backend/nest/src/earnings-config/earnings-config.spec.ts` | T-EARN-R05a, T-EARN-R05b |
| REQ-EARN-CFG-F-006 | `frontend/src/settings/settings.test.tsx` | T-EARN-R06 |
| REQ-EARN-CFG-F-007 | `frontend/src/settings/settings.test.tsx` | T-EARN-R07 |
| REQ-EARN-CFG-F-008 | `backend/nest/src/earnings-config/earnings-config.spec.ts` | T-EARN-R08 |
| REQ-EARN-CFG-F-009 | `frontend/src/settings/settings.test.tsx` | T-EARN-R09 |
| REQ-EARN-CFG-C-001 | `backend/nest/src/earnings-config/earnings-config.spec.ts` | T-EARN-R03 through T-EARN-R09 |
| REQ-EARN-CFG-C-002 | `backend/nest/src/earnings-config/earnings-config.spec.ts` | T-EARN-R03 |

---

## Open Questions

- **OQ-EARN-001** *(Deferred)*: Should the earnings engine be triggered automatically on accounting period close or on-demand? Out of scope for this ticket.
- **OQ-EARN-002** *(Assumed — first match wins)*: Rule matching uses priority ordering; the first matching rule wins. If multi-pattern overlays are needed, this requirement must be revised.

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-05-29 | AI | Initial requirements created; REQ-EARN-CFG-S-001, F-001 through F-009, C-001, C-002 — implementation complete |

---

## Design Notes

### API Endpoints

| Method | Endpoint | Auth required |
|--------|----------|---------------|
| GET | `/api/earnings-config/patterns` | `client_admin`, `internal_admin` |
| POST | `/api/earnings-config/patterns` | `client_admin`, `internal_admin` |
| PATCH | `/api/earnings-config/patterns/:id/deactivate` | `client_admin`, `internal_admin` |
| GET | `/api/earnings-config/patterns/:id/points` | `client_admin`, `internal_admin` |
| POST | `/api/earnings-config/patterns/:id/points` | `client_admin`, `internal_admin` |
| DELETE | `/api/earnings-config/patterns/:id/points/:pointId` | `client_admin`, `internal_admin` |
| GET | `/api/earnings-config/rules` | `client_admin`, `internal_admin` |
| POST | `/api/earnings-config/rules` | `client_admin`, `internal_admin` |
| PUT | `/api/earnings-config/rules/:id` | `client_admin`, `internal_admin` |
| PATCH | `/api/earnings-config/rules/:id/deactivate` | `client_admin`, `internal_admin` |

### Database Tables

| Table | Purpose |
|-------|---------|
| `earning_patterns` | Pattern definitions (type, earn_by, org_code, soft-delete) |
| `earning_pattern_points` | Interpolation curve knots for interpolated patterns |
| `earning_pattern_rules` | Priority-ordered selection rules linking a pattern to policy criteria |

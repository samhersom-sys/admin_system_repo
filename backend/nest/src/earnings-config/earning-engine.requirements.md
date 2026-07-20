# REQUIREMENTS — Earning Engine (Phase 2)

**Domain Code:** `EARN`
**Location:** `backend/nest/src/earnings-config/earning-engine.requirements.md`
**Status:** Draft — pending review
**Phase 1 requirements:** `frontend/src/settings/EarningsConfigPage.requirements.md` (domain `EARN-CFG` — do not duplicate those REQ IDs)
**Test files:**
- `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` — T-EARN-BE-001 through T-EARN-BE-022
- `frontend/src/policies/__tests__/PolicySectionFinanceSummary.test.tsx` — T-EARN-FE-001 through T-EARN-FE-007

---

## Scope

### In scope
- Remove `product_id` column from `earning_pattern_rules` entity and schema (answered — OQ-054)
- Remove product selector from `RuleForm` in `EarningsConfigPage.tsx`
- Add `resolved_earning_pattern_id` INT FK (nullable; no cascade delete) to `policy_sections` entity (answered — OQ-053)
- New `policy_earning_periods` table via TypeORM `PolicyEarningPeriod` entity
- Pattern resolver service method `resolvePatternForSection(section, orgCode)` inside the `earnings-config` module
- Earning engine service `calculateForSection(sectionId, orgCode)` covering all three pattern types: `upfront`, `straight_line`, `interpolated`
- NestJS `@Cron` background job (nightly, 02:00 UTC) and manual trigger endpoints
- `measure_definitions` entity: add `has_earning_variants` BOOLEAN DEFAULT false column (answered — OQ-055)
- Seed updates: flag `grossWrittenPremium` with `has_earning_variants = true`; add seeded internal measures `grossWrittenPremiumEarned` and `grossWrittenPremiumUnearned`
- `reporting/field-mappings.ts`: add `policy_earning_periods` DATA_SOURCES key
- New `PolicySectionFinanceSummary.tsx` component at `frontend/src/policies/`
- "Finance Summary" tab on Policy Section view page (answered — OQ-057)
- "Finance Summary" tab on Policy layer view page — aggregate totals across all sections (answered — OQ-057)

### Out of scope
- Ledger periods / accounting period close — deferred (OQ-LEDGER-001)
- Product-level pattern rule matching — deferred (OQ-EARN-PROD-001)
- Net net premium, brokerage, commission earned measures — deferred (premium decomposition model not agreed)
- Manual editing of earning periods (periods are fully recalculated by the engine; no edit UI)
- Policy endorsement re-earning — deferred (separate feature; endorsement earning adjustment not yet scoped)

---

## Impact Analysis

### UI / Front-End Impact

| Component | Change |
|-----------|--------|
| `frontend/src/settings/EarningsConfigPage.tsx` — `RuleForm` | Product selector field removed |
| `frontend/src/policies/PolicySectionFinanceSummary.tsx` | New component added |
| Policy Section view page | New "Finance Summary" tab added, rendering `PolicySectionFinanceSummary` for the section |
| Policy layer view page | New "Finance Summary" tab added, rendering aggregate earned/unearned totals across all sections of the policy |

### API Impact

New endpoints added under `/api/earning-engine/`:

| Method | Path | Auth Roles | Description |
|--------|------|-----------|-------------|
| `POST` | `/api/earning-engine/sections/resolve` | `client_admin`, `internal_admin` | Resolve pattern for section attributes; returns `resolvedEarningPatternId` or 422 |
| `POST` | `/api/earning-engine/run` | `internal_admin` | Batch recalculate all active sections org-wide |
| `POST` | `/api/earning-engine/sections/:sectionId/calculate` | `client_admin`, `internal_admin` | Recalculate one section |
| `GET` | `/api/earning-engine/sections/:sectionId/periods` | `client_admin`, `internal_admin` | List earning periods for a section |

Modified existing endpoints:
- `POST /api/policies/:policyId/sections` — pattern resolver fires on save; adds HTTP 422 response when no rule matches
- `PATCH /api/policies/:policyId/sections/:sectionId` — pattern resolver fires on save; adds HTTP 422 response when no rule matches

Response shape for trigger endpoints: `{ processed: number, errors: string[] }`

### Database Impact

| Change | Table / Entity | File |
|--------|---------------|------|
| Drop `product_id` column | `earning_pattern_rules` | `backend/nest/src/entities/earning-pattern.entity.ts` |
| Add `resolved_earning_pattern_id` INT FK (nullable, no cascade delete) | `policy_sections` | `backend/nest/src/entities/policy-section.entity.ts` |
| New table `policy_earning_periods` | `PolicyEarningPeriod` entity | `backend/nest/src/earnings-config/policy-earning-period.entity.ts` |
| Add `has_earning_variants` BOOLEAN DEFAULT false | `measure_definitions` | `backend/nest/src/measures/measure-definition.entity.ts` |

Seed changes:
- `db/seeds/032-measure-definitions.js` — set `has_earning_variants = true` on the `grossWrittenPremium` row; insert `grossWrittenPremiumEarned` and `grossWrittenPremiumUnearned` internal measures with `source_key = 'policy_earning_periods'`

---

## Backup Coverage Map

Sources read: None — the earning engine is net-new functionality with no equivalent implementation in `policy-forge-chat (BackUp)/`. The BackUp workspace contains no `earning`, `earned`, or `unearned` references. No coverage map rows are required.

---

## Functional Requirements

### REQ-EARN-F-001 — Pattern resolver endpoint: evaluate rules and return resolved pattern ID

The `EarningEngineController` shall expose a `POST /api/earning-engine/sections/resolve` endpoint accessible to callers with role `client_admin` or `internal_admin` that accepts `{ classOfBusiness, contractType, includeIncepted }` in the request body and, after evaluating all active `earning_pattern_rules` for the caller's `org_code` ordered by `priority ASC`, returns HTTP 200 with body `{ resolvedEarningPatternId: number, patternName: string }` on a successful match.

Note (SA-compliant implementation): The resolver lives entirely within `EarningEngineModule`. The frontend calls this endpoint before saving a section, then includes `resolvedEarningPatternId` in the section save payload. `PoliciesService` validates only that the ID exists on `earning_patterns`; it does not import `EarningEngineService`. This satisfies §04 no cross-domain service injection.

**Acceptance criterion:** Given an org with one active rule matching `classOfBusiness = 'Marine'`, `contractType = 'Open Market'`, `includeIncepted = true`, a `POST /api/earning-engine/sections/resolve` request with those values returns HTTP 200 with a non-null `resolvedEarningPatternId`; a request with a `client_admin` JWT for a different org returns HTTP 403.

---

### REQ-EARN-F-002 — Pattern resolver endpoint: HTTP 422 when no rule matches

The `POST /api/earning-engine/sections/resolve` endpoint shall return HTTP 422 when no active rule in the caller's org matches the supplied `classOfBusiness`, `contractType`, and `includeIncepted` values, with a response body listing each unmatched attribute name and value so that the caller can inform the user which combination lacks a configured pattern.

**Acceptance criterion:** Given an org where no active rule matches `classOfBusiness = 'Unknown'`, `contractType = 'Unknown'`, `includeIncepted = false`, the endpoint returns HTTP 422 and the JSON response body contains a `{ unmatchedAttributes: { classOfBusiness, contractType, includeIncepted } }` structure.

---

### REQ-EARN-F-003 — Engine: upfront pattern calculation

The `EarningEngineService.calculateForSection` method shall, for a section whose resolved pattern has `pattern_type = 'upfront'`, produce one `policy_earning_periods` row per calendar month spanned by the coverage period where the inception-month row carries `earned_amount = total_premium` and `unearned_amount = 0.0000`, and every subsequent month row carries `total_premium = 0.0000`, `earned_amount = 0.0000`, and `unearned_amount = 0.0000`.

**Acceptance criterion:** For an upfront-pattern section, the inception-month row has `earned_amount = gross_written_premium` and `unearned_amount = 0.0000`; the sum of all rows' `earned_amount` values equals the section's gross written premium; all subsequent month rows have `total_premium = 0.0000`.

---

### REQ-EARN-F-004 — Engine: straight-line pattern calculation

The `EarningEngineService.calculateForSection` method shall, for a section whose resolved pattern has `pattern_type = 'straight_line'`, allocate each calendar month's `total_premium` as `(days_in_period / total_policy_days) × gross_written_premium` (using exact integer day-count), set `earned_amount` to `(days_earned / total_policy_days) × gross_written_premium` where `days_earned` is the number of coverage days in that calendar month that have elapsed by the engine's calculation date, and set `unearned_amount = total_premium − earned_amount` for each row.

**Acceptance criterion:** For a 365-day straight-line-pattern section with gross written premium of 3,650.00, a fully elapsed 31-day January month produces `total_premium = 31 × (3650 / 365) = 310.0000`, `earned_amount = 310.0000`, and `unearned_amount = 0.0000`; a partially elapsed 31-day month where 15 days have elapsed produces `total_premium = 310.0000`, `earned_amount = 150.0000`, and `unearned_amount = 160.0000`.

---

### REQ-EARN-F-005 — Engine: interpolated pattern calculation

The `EarningEngineService.calculateForSection` method shall, for a section whose resolved pattern has `pattern_type = 'interpolated'`, allocate each calendar month's `total_premium` using the cumulative earning curve defined by the associated `earning_pattern_points` rows (sorted by `pct_through_policy ASC`) by computing the incremental earned percentage between the curve value at the start and end of that month's coverage window expressed as a percentage of the total policy days, and shall set `earned_amount` as the portion of `total_premium` corresponding to the days elapsed within that month by the calculation date.

**Acceptance criterion:** For an interpolated pattern with two points — 50% through policy earns 80% cumulative, 100% through policy earns 100% cumulative — a section halfway through its coverage period shall have cumulative `earned_amount` across all rows to date equal to 80% of gross written premium, within ±0.0001 rounding tolerance.

---

### REQ-EARN-F-006 — Engine: balance invariant per row

The `EarningEngineService.calculateForSection` method shall produce `policy_earning_periods` rows where `earned_amount + unearned_amount = total_premium` exactly for every row, with no rounding loss permitted between the three values.

**Acceptance criterion:** For any persisted `policy_earning_periods` row, the database assertion `ABS((earned_amount + unearned_amount) - total_premium) < 0.0001` holds true; a test suite asserting this condition against every row produced by the engine for all three pattern types shall pass.

---

### REQ-EARN-F-007 — Engine: idempotent upsert into `policy_earning_periods`

The `EarningEngineService.calculateForSection` method shall upsert rows into `policy_earning_periods` using the unique key `(policy_section_id, period_year, period_month)`, updating all calculated column values and setting `calculated_at = NOW()` on each upsert, so that re-running the engine for the same section produces identical rows with no duplicates.

**Acceptance criterion:** Running `calculateForSection` twice for the same section ID produces the same number of rows as running it once; the row count in `policy_earning_periods` for that section does not increase on the second run; `calculated_at` is refreshed on the second run.

---

### REQ-EARN-F-008 — Background cron job: nightly earning run

The `EarningEngineCronService` shall schedule a NestJS `@Cron` job that executes at 02:00 UTC every night and processes all `policy_sections` rows where `resolved_earning_pattern_id IS NOT NULL` and whose parent policy has `status = 'Active'`, calling `calculateForSection(section.id, section.orgCode)` for each qualifying section, passing the section's own `org_code` as the `orgCode` argument (per REQ-EARN-C-001 cron-path multi-tenant rule).

**Acceptance criterion:** The cron expression resolves to 02:00 UTC daily; a unit test mocking the repository confirms that only sections satisfying both filter conditions (`resolved_earning_pattern_id IS NOT NULL` and parent policy `status = 'Active'`) are passed to `calculateForSection`; the unit test confirms that `section.orgCode` is passed as the second argument to each `calculateForSection` invocation.

---

### REQ-EARN-F-009 — Manual trigger: batch recalculate all active sections

The `EarningEngineController` shall expose a `POST /api/earning-engine/run` endpoint restricted to callers with role `internal_admin` that invokes `calculateForSection` for every qualifying `policy_sections` row (same filter as the cron job) and returns `{ processed: N, errors: string[] }` where `N` is the count of sections successfully processed and `errors` lists any section IDs that failed.

**Acceptance criterion:** A request to `POST /api/earning-engine/run` with a valid `internal_admin` JWT returns HTTP 200 with a JSON body matching `{ processed: number, errors: string[] }`; a request with a `client_admin` JWT returns HTTP 403.

---

### REQ-EARN-F-010 — Manual trigger: recalculate one section

The `EarningEngineController` shall expose a `POST /api/earning-engine/sections/:sectionId/calculate` endpoint accessible to callers with role `client_admin` or `internal_admin` that invokes `calculateForSection` for the specified section ID and returns `{ processed: 1, errors: [] }` on success.

**Acceptance criterion:** A request to `POST /api/earning-engine/sections/42/calculate` with a valid `client_admin` JWT for the section's org returns HTTP 200 with body `{ processed: 1, errors: [] }`; a request for a section belonging to a different org returns HTTP 403.

---

### REQ-EARN-F-011 — GET earning periods endpoint

The `EarningEngineController` shall expose a `GET /api/earning-engine/sections/:sectionId/periods` endpoint accessible to callers with role `client_admin` or `internal_admin` that returns all `policy_earning_periods` rows for the specified section, scoped to the caller's `org_code`, ordered by `period_year ASC, period_month ASC`.

**Acceptance criterion:** A request to `GET /api/earning-engine/sections/:sectionId/periods` returns HTTP 200 with a JSON array of period rows ordered ascending by year then month; a request for a section whose `org_code` does not match the caller's JWT `org_code` returns HTTP 403.

---

### REQ-EARN-F-012 — Measure variant seed: `grossWrittenPremiumEarned` and `grossWrittenPremiumUnearned`

The Phase 2 seed shall insert two internal `measure_definitions` rows — `grossWrittenPremiumEarned` (label: "Gross Written Premium Earned", `source_key = 'policy_earning_periods'`, `measure_type = 'sum'`) and `grossWrittenPremiumUnearned` (label: "Gross Written Premium Unearned", `source_key = 'policy_earning_periods'`, `measure_type = 'sum'`) — and shall update the existing `grossWrittenPremium` row to set `has_earning_variants = true`.

**Acceptance criterion:** After the seed runs, `SELECT key, has_earning_variants FROM measure_definitions WHERE key IN ('grossWrittenPremium', 'grossWrittenPremiumEarned', 'grossWrittenPremiumUnearned')` returns three rows; `grossWrittenPremium.has_earning_variants = true`; the two variant rows have `source_key = 'policy_earning_periods'` and `measure_type = 'sum'`.

---

### REQ-EARN-F-013 — Reporting field-mappings: `policy_earning_periods` source key

The `reporting/field-mappings.ts` file shall define a `policy_earning_periods` entry in `DATA_SOURCES` with `table = 'policy_earning_periods'`, `orgCol = 'org_code'`, and fields for `earned_amount`, `unearned_amount`, `total_premium`, `period_year`, and `period_month`, so that reporting measures sourced from `policy_earning_periods` can be evaluated by the reporting service.

**Acceptance criterion:** The `DATA_SOURCES['policy_earning_periods']` key exists in `field-mappings.ts` with `orgCol = 'org_code'` and all five required field keys present; a unit test confirms the key and field presence.

---

### REQ-EARN-F-014 — Frontend: `PolicySectionFinanceSummary` component

The `PolicySectionFinanceSummary` component at `frontend/src/policies/PolicySectionFinanceSummary.tsx` shall fetch earning periods from `GET /api/earning-engine/sections/:sectionId/periods` on mount and display a table with columns: Calendar Period (formatted as "Mon YYYY", e.g. "Jan 2026"), Total Premium, Earned, Unearned, Basis (`earn_by_basis` value), and Days Earned / Days in Period; shall display a loading indicator while the request is in flight; shall display an empty-state message when the response array is empty; and shall display an error message when the request fails.

**Acceptance criterion:** When the API returns an empty array, the component renders an empty-state message and no table rows; when the API returns data, the table renders one row per period with all six column values; when the API returns an error, the component renders an error message without a table.

---

### REQ-EARN-F-015 — Finance Summary tab on Policy Section view page

The Policy Section view page shall render a "Finance Summary" tab in its tab navigation that, when active, renders the `PolicySectionFinanceSummary` component for the current section ID.

**Acceptance criterion:** The Policy Section view page renders a tab labelled "Finance Summary"; selecting that tab mounts `PolicySectionFinanceSummary` and triggers a fetch to `/api/earning-engine/sections/:sectionId/periods`; the tab is not visible to unauthenticated users.

---

### REQ-EARN-F-016 — Finance Summary tab on Policy layer view page

The Policy layer view page shall render a "Finance Summary" tab in its tab navigation that, when active, displays aggregate `earned_amount` and `unearned_amount` totals across all `policy_earning_periods` rows belonging to all sections of the policy, grouped by calendar period (period_year, period_month), ordered by period_year ASC, period_month ASC.

**Acceptance criterion:** The Policy layer view page renders a tab labelled "Finance Summary"; the aggregate view sums `earned_amount` and `unearned_amount` across all sections for each calendar period; the totals displayed match the sum of individual section figures.

---

### REQ-EARN-F-017 — Remove product selector from `RuleForm` in `EarningsConfigPage.tsx`

The `RuleForm` component within `EarningsConfigPage.tsx` shall not render a product selector field, and the rule creation payload sent to `POST /api/earnings-config/rules` shall not include a `product_id` property.

**Acceptance criterion:** Inspecting the rendered `RuleForm` DOM finds no product selector element; inspecting the request body sent on rule creation finds no `product_id` key.

---

## Schema Requirements

### REQ-EARN-S-001 — Remove `product_id` from `EarningPatternRule` entity and schema

The `EarningPatternRule` TypeORM entity shall not declare a `productId` property, and a TypeORM migration shall drop the `product_id` column from the `earning_pattern_rules` table.

**Acceptance criterion:** After migration, `SELECT column_name FROM information_schema.columns WHERE table_name = 'earning_pattern_rules' AND column_name = 'product_id'` returns zero rows; the `EarningPatternRule` entity file contains no `productId` declaration.

---

### REQ-EARN-S-002 — Add `resolved_earning_pattern_id` FK to `policy_sections`

The `PolicySection` TypeORM entity shall declare a nullable `resolvedEarningPatternId` property using a plain `@Column({ name: 'resolved_earning_pattern_id', type: 'int', nullable: true })` decorator with NO `@ManyToOne`, `@JoinColumn`, or any other TypeORM relation decorator and with no import of the `EarningPattern` class — the foreign key constraint referencing `earning_patterns(id)` shall be enforced solely by the TypeORM migration script — and the migration shall add that column to the `policy_sections` table.

**Acceptance criterion:** After migration, the `policy_sections` table contains `resolved_earning_pattern_id INT NULL` with a database-level foreign key constraint to `earning_patterns(id)` and no cascade delete; a `policy_sections` row may be inserted with `resolved_earning_pattern_id = NULL`; the `policy-section.entity.ts` file contains no import of `EarningPattern` or `EarningPatternRule`.

---

### REQ-EARN-S-003 — Create `policy_earning_periods` table via TypeORM entity

The earning engine module shall provide a `PolicyEarningPeriod` TypeORM entity at `backend/nest/src/earnings-config/policy-earning-period.entity.ts` that defines the `policy_earning_periods` table with all columns, types, constraints, and unique index specified in Design Notes §DN-1.

**Acceptance criterion:** After schema synchronisation, the table exists with all 16 columns at the specified types and precisions; a `NUMERIC(18,4)` type is confirmed on `total_premium`, `earned_amount`, and `unearned_amount`; the unique constraint on `(policy_section_id, period_year, period_month)` rejects a duplicate insert of the same triplet; `earn_by_basis` accepts only the values `'day'` or `'period'`.

---

### REQ-EARN-S-004 — Add `has_earning_variants` to `measure_definitions` entity

The `MeasureDefinition` TypeORM entity shall declare a `hasEarningVariants` BOOLEAN column with database name `has_earning_variants` and a default value of `false`, and a TypeORM migration shall add that column to the `measure_definitions` table.

**Acceptance criterion:** After migration, the column exists on `measure_definitions` as `BOOLEAN NOT NULL DEFAULT false`; all pre-existing rows carry `has_earning_variants = false`; the entity property `hasEarningVariants` is settable and persists correctly.

---

## Constraint Requirements

### REQ-EARN-C-001 — Multi-tenant data isolation for `policy_earning_periods`

Every query against the `policy_earning_periods` table executed by the earning engine service shall include a `WHERE org_code = :orgCode` filter clause using the `org_code` value derived from the authenticated caller's JWT, so that no earning period data belonging to one organisation is returned to or modified by a caller from another organisation.

For the nightly scheduled cron path (REQ-EARN-F-008), where no JWT caller is present, `org_code` shall be derived from the `org_code` column of the `policy_sections` row being processed; the `calculateForSection` method call from the cron job shall pass `section.orgCode` as the `orgCode` argument to every invocation.

**Acceptance criterion:** A unit test confirms that the repository method producing `policy_earning_periods` results always includes `org_code = :orgCode` in the generated SQL; a direct database query for periods of org A using the token of org B returns zero rows; a unit test confirms that for a section whose `org_code = 'ORG-A'`, all `policy_earning_periods` rows written by the cron path carry `org_code = 'ORG-A'`.

---

### REQ-EARN-C-002 — Resolver evaluates only active rules in priority order

The `EarningsConfigService.resolvePatternForSection` method shall query only `earning_pattern_rules` rows where `is_active = true` and shall order the result set by `priority ASC` before evaluating criteria, so that soft-deleted rules are never considered and the lowest-priority-number rule always takes precedence when multiple rules match.

**Acceptance criterion:** A unit test confirms that inserting an `is_active = false` rule whose criteria match the section does not cause that rule to be selected; a unit test confirms that when two active rules both match, the one with the lower `priority` value is selected.

---

### REQ-EARN-C-003 — Engine shall not modify earning periods belonging to a different org

The `EarningEngineService.calculateForSection` method shall verify that the `policy_sections` row being calculated belongs to the caller's `org_code` before performing any write operation, and shall throw a 403 error if the section's `org_code` does not match the caller's `org_code`.

**Acceptance criterion:** A unit test confirms that calling `calculateForSection` with a section ID belonging to org B while the caller's `org_code` is org A raises a ForbiddenException and produces no `policy_earning_periods` rows for org B.

---

### REQ-EARN-C-004 — Numeric precision: NUMERIC(18,6) intermediate, NUMERIC(18,4) storage; no FLOAT

The earning engine service shall perform all intermediate arithmetic using PostgreSQL `NUMERIC(18,6)` precision (or TypeScript `bigint`/`Decimal` library arithmetic) and shall store all final values in `policy_earning_periods` columns as `NUMERIC(18,4)`; no `FLOAT` or `REAL` types shall be used for any earning amount column or intermediate calculation variable.

**Acceptance criterion:** A code review confirms no `float`, `number` (for monetary calculations), or `FLOAT` / `REAL` database column type is used for earning amounts; a test with a premium of 1.0001 and a 3-month policy confirms each month's stored value is NUMERIC(18,4) and the three rows' `total_premium` values sum exactly to 1.0001.

---

## Non-Functional Requirements

None defined for this phase. Performance, reliability, and accessibility requirements for the earning engine are deferred until the initial implementation is proven in a production environment.

---

## Traceability Table

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-EARN-F-001 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-001, T-EARN-BE-002 |
| REQ-EARN-F-002 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-003 |
| REQ-EARN-F-003 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-004 |
| REQ-EARN-F-004 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-005 |
| REQ-EARN-F-005 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-006 |
| REQ-EARN-F-006 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-007 |
| REQ-EARN-F-007 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-008 |
| REQ-EARN-F-008 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-009 |
| REQ-EARN-F-009 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-010 |
| REQ-EARN-F-010 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-011 |
| REQ-EARN-F-011 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-012 |
| REQ-EARN-F-012 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-013 |
| REQ-EARN-F-013 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-014 |
| REQ-EARN-F-014 | `frontend/src/policies/__tests__/PolicySectionFinanceSummary.test.tsx` | T-EARN-FE-001, T-EARN-FE-002, T-EARN-FE-003, T-EARN-FE-004 |
| REQ-EARN-F-015 | `frontend/src/policies/__tests__/PolicySectionFinanceSummary.test.tsx` | T-EARN-FE-005 |
| REQ-EARN-F-016 | `frontend/src/policies/__tests__/PolicySectionFinanceSummary.test.tsx` | T-EARN-FE-006 |
| REQ-EARN-F-017 | `frontend/src/policies/__tests__/PolicySectionFinanceSummary.test.tsx` | T-EARN-FE-007 |
| REQ-EARN-S-001 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-015 |
| REQ-EARN-S-002 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-016 |
| REQ-EARN-S-003 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-017 |
| REQ-EARN-S-004 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-018 |
| REQ-EARN-C-001 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-019 |
| REQ-EARN-C-002 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-020 |
| REQ-EARN-C-003 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-021 |
| REQ-EARN-C-004 | `backend/nest/src/earnings-config/__tests__/earning-engine.spec.ts` | T-EARN-BE-022 |

---

## Open Questions

- **OQ-EARN-PROD-001** *(Deferred — do not implement)*: Once the products module is formally implemented with a TypeORM entity and stable schema, should `earning_pattern_rules` be extended with a `product_id` FK for product-level pattern matching? Blocked by products module implementation. No action in the current build.

- **OQ-LEDGER-001** *(Open — not in scope for this build)*: Should a `ledger_periods` table be introduced to allow finance users to define, open, and close accounting periods, and should the earning engine optionally aggregate earned figures into ledger period boundaries instead of calendar months? See `docs/Technical Documentation/08-Open-Questions.md` for full question text. Not in scope; to be requirements-driven before any implementation.

No new open questions have been raised. OQ-052 through OQ-057 are all answered and baked into the requirements above.

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `frontend/src/settings/EarningsConfigPage.requirements.md` (EARN-CFG) | Phase 1 requirements | Must remain implemented; this phase extends it |
| `backend/nest/src/entities/earning-pattern.entity.ts` | Entity | Phase 2 removes `productId` from `EarningPatternRule` |
| `backend/nest/src/entities/policy-section.entity.ts` | Entity | Phase 2 adds `resolvedEarningPatternId` FK |
| `backend/nest/src/measures/measure-definition.entity.ts` | Entity | Phase 2 adds `hasEarningVariants` BOOLEAN |
| `db/seeds/032-measure-definitions.js` | Seed | Phase 2 adds two new rows and updates one |
| `backend/nest/src/reporting/field-mappings.ts` | Reporting layer | Phase 2 adds `policy_earning_periods` source key |
| `backend/nest/src/earnings-config/earnings-config.module.ts` | NestJS module | Phase 2 extends this module with engine service, cron service, and controller |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-06-19 | BA Agent | Initial draft — REQ-EARN-F-001 through F-017, REQ-EARN-S-001 through S-004, REQ-EARN-C-001 through C-004 written; Impact Analysis complete; Backup Coverage Map confirmed empty (net-new feature) |

---

## Design Notes

### DN-1: `policy_earning_periods` Column Specification

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `SERIAL` | Primary Key |
| `policy_section_id` | `INT` | NOT NULL; FK → `policy_sections(id)` ON DELETE CASCADE |
| `org_code` | `VARCHAR(100)` | NOT NULL |
| `period_year` | `INT` | NOT NULL |
| `period_month` | `INT` | NOT NULL; CHECK (period_month >= 1 AND period_month <= 12) |
| `total_premium` | `NUMERIC(18,4)` | NOT NULL |
| `earned_amount` | `NUMERIC(18,4)` | NOT NULL |
| `unearned_amount` | `NUMERIC(18,4)` | NOT NULL |
| `earn_by_basis` | `VARCHAR(20)` | NOT NULL; CHECK (earn_by_basis IN ('day', 'period')) |
| `days_in_period` | `INT` | NOT NULL |
| `days_earned` | `INT` | NOT NULL |
| `pattern_id` | `INT` | FK → `earning_patterns(id)` (nullable — recorded for audit; no cascade) |
| `calculated_at` | `TIMESTAMPTZ` | NOT NULL; DEFAULT NOW() |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() |
| `updated_at` | `TIMESTAMPTZ` | nullable |
| UNIQUE | `(policy_section_id, period_year, period_month)` | Idempotent upsert key |

`pattern_id` is nullable and stored for audit purposes; it records which pattern was active at calculation time. Deleting a pattern does not cascade-delete period rows.

### DN-2: API Contract

| Method | Path | Auth | Request body | Success response | Error responses |
|--------|------|------|-------------|-----------------|-----------------|
| `POST` | `/api/earning-engine/run` | `internal_admin` | none | `200 { processed: N, errors: [] }` | `403` if role insufficient |
| `POST` | `/api/earning-engine/sections/:sectionId/calculate` | `client_admin`, `internal_admin` | none | `200 { processed: 1, errors: [] }` | `403` if wrong org or role; `404` if section not found |
| `GET` | `/api/earning-engine/sections/:sectionId/periods` | `client_admin`, `internal_admin` | none | `200 PolicyEarningPeriod[]` ordered by year/month ASC | `403` if wrong org or role; `404` if section not found |

Policy section save endpoints (existing — modified behaviour):

| Trigger | Error added |
|---------|-------------|
| `POST /api/policies/:policyId/sections` | `422 { message: "No earning rule matched", attributes: { class_of_business, contract_type, include_incepted } }` |
| `PATCH /api/policies/:policyId/sections/:sectionId` | Same as above |

### DN-3: Engine Algorithm Notes

#### Upfront (`pattern_type = 'upfront'`)

- One row is produced per calendar month that intersects the policy coverage period.
- **Inception-month row**: `total_premium = gross_written_premium`; `earned_amount = gross_written_premium`; `unearned_amount = 0.0000`; `days_earned = days_in_period`; `days_in_period = days in that calendar month under coverage`.
- **All subsequent month rows**: `total_premium = 0.0000`; `earned_amount = 0.0000`; `unearned_amount = 0.0000`.
- Rationale: 100% of premium is earned on day 1 of coverage. All subsequent periods carry zero allocation.

#### Straight-line (`pattern_type = 'straight_line'`)

- `total_policy_days` = `expiry_date − inception_date` in whole calendar days (inclusive of inception day, exclusive of expiry day — consistent with insurance day-count convention).
- For each calendar month M intersecting the coverage period:
  - `days_in_period` = count of days in M that fall within [inception_date, expiry_date)
  - `total_premium` = `ROUND((days_in_period / total_policy_days) × gross_written_premium, 6)` stored as NUMERIC(18,4)
  - `days_earned` = count of coverage days in M elapsed by the engine's calculation date
  - `earned_amount` = `ROUND((days_earned / total_policy_days) × gross_written_premium, 6)` stored as NUMERIC(18,4)
  - `unearned_amount` = `total_premium − earned_amount` (computed last to absorb rounding residual — satisfies F-006)
- The rounding residual strategy (computing `unearned_amount` as the difference rather than independently) ensures the balance invariant (REQ-EARN-F-006) holds exactly.

#### Interpolated (`pattern_type = 'interpolated'`)

- Requires at least one `earning_pattern_points` row; all increments must sum to 100 (validated by Phase 1 — REQ-EARN-CFG-F-005).
- Build the cumulative earning curve: sort points by `pct_through_policy ASC`; for each point P, `cumulative_earned_pct[P] = sum of all pct_earned_increment values up to and including P`.
- For each calendar month M intersecting the coverage period:
  - `pct_start` = `(cumulative_coverage_days_at_start_of_M / total_policy_days) × 100`
  - `pct_end`   = `(cumulative_coverage_days_at_end_of_M / total_policy_days) × 100`
  - Interpolate the cumulative earned % at `pct_start` and `pct_end` against the curve (linear interpolation between adjacent knots).
  - `total_premium` for M = `(cumulative_pct_at_pct_end − cumulative_pct_at_pct_start) / 100 × gross_written_premium`
  - `days_in_period` = count of coverage days in M
  - `days_earned` = count of coverage days in M elapsed by the calculation date
  - `earned_amount` = `(days_earned / days_in_period) × total_premium` (linear interpolation within the period bucket)
  - `unearned_amount` = `total_premium − earned_amount` (rounding residual absorbed here — satisfies F-006)
- If `pct_end` exactly equals a knot's `pct_through_policy`, use the knot's cumulative value directly (no interpolation needed).

### DN-4: Pattern Resolver — Matching Logic

A rule matches a section when **all three** of the following conditions hold simultaneously:
1. `rule.class_of_business IS NULL` OR `rule.class_of_business = section.class_of_business`
2. `rule.contract_type IS NULL` OR `rule.contract_type = section.contract_type` (resolved from the parent policy record if not present directly on the section)
3. `rule.include_incepted = true` OR `section.inception_date > NOW()` (i.e. if include_incepted is false, the rule only matches policies not yet incepted)

Rules are evaluated in ascending `priority` order. The first matching rule wins. If no rule matches, the resolver raises a 422 validation error (REQ-EARN-F-002).

### DN-5: Phase 1 / Phase 2 Boundary Summary

| Concern | Phase 1 (EARN-CFG) | Phase 2 (EARN — this file) |
|---------|--------------------|-----------------------------|
| Pattern CRUD | ✅ built | No change |
| Interpolation point editor | ✅ built | No change |
| Rule CRUD (with product selector) | ✅ built | Remove product selector (REQ-EARN-F-017) |
| Pattern resolver | ❌ not built | Built (REQ-EARN-F-001, F-002) |
| Engine calculation | ❌ not built | Built (REQ-EARN-F-003 through F-007) |
| Cron job | ❌ not built | Built (REQ-EARN-F-008) |
| Manual trigger endpoints | ❌ not built | Built (REQ-EARN-F-009, F-010) |
| Finance Summary UI | ❌ not built | Built (REQ-EARN-F-014 through F-016) |
| Measure variants + seed | ❌ not built | Built (REQ-EARN-F-012, F-013) |
| Reporting field-mappings | ❌ not built | Built (REQ-EARN-F-013) |
| Schema: `product_id` removal | ❌ deferred | Removed (REQ-EARN-S-001) |
| Schema: `resolved_earning_pattern_id` | ❌ not built | Built (REQ-EARN-S-002) |
| Schema: `policy_earning_periods` table | ❌ not built | Built (REQ-EARN-S-003) |
| Schema: `has_earning_variants` flag | ❌ not built | Built (REQ-EARN-S-004) |

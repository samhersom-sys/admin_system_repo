# Batch C — Quote & Policy Section Coverages
**Created:** 2026-04-09  
**Status:** 🔴 Not started  
**References:** [reconstruction-gap-analysis.md](reconstruction-gap-analysis.md) §4.5 (REQ-POL-BE-F-007), [quotes.requirements.md](../../backend/routes/quotes.requirements.md) §3.13–3.16 (REQ-QUO-BE-F-041–044)  
**Guideline:** Three-Artifact Rule — Requirements → Tests → Code  

---

## Overview

Batch C closes the **quote section coverages** and **policy section coverages** gaps identified in the comprehensive audit (2026-04-09).  These are the last structural pieces before the Sections tab in both the Quote and Policy views becomes fully functional end-to-end.

| ID | Area | Layer | Status |
|----|------|-------|--------|
| C0 | Fix `policy_section_coverages` table name mismatch | DB + BE | ❌ Not started |
| C1 | Migration 099 — create `quote_section_coverages` table | DB | ❌ Not started |
| C2 | Quote coverages API — implement REQ-QUO-BE-F-041 to F-044 | BE | ❌ Not started |
| C3 | Policy coverages write API — POST / PUT / DELETE | BE | ❌ Not started |
| C4 | Layer 2 backend tests — quotes and policies coverages | Tests | ❌ Not started |
| C5 | Seed data — quote_sections, policy_sections, policy_section_coverages | Seeds | ❌ Not started |
| C6 | Update requirements files to reflect actual migration numbers | Docs | ❌ Not started |

---

## Current State Summary

### What exists

| Layer | What is there |
|-------|--------------|
| DB | `quote_sections` ✅ (migration 012), `policy_sections` ✅ (013), `policy_coverages` ✅ (014 + 080) |
| DB | `quote_section_coverages` ❌ MISSING — migration 094 was consumed by `submission_related`; new migration needed |
| DB | `policy_coverages` exists but is queried as `policy_section_coverages` in the NestJS service — **name mismatch bug** |
| BE | Quote coverages endpoints: ❌ None implemented (REQ-QUO-BE-F-041–044 marked pending) |
| BE | Policy coverages GET: ✅ Exists (`REQ-POL-BE-F-014`) but queries wrong table name |
| BE | Policy coverages POST/PUT/DELETE: ❌ Not implemented |
| FE | `QuoteSectionViewPage` ✅, `QuoteCoverageDetailPage` ✅, `QuoteCoverageSubDetailPage` ✅ |
| FE | `PolicySectionViewPage` ✅, `PolicyCoverageDetailPage` ✅, `PolicyCoverageSubDetailPage` ✅ |
| Seeds | `quote_sections`: 0 rows, `policy_sections`: 0 rows, `policy_coverages`: 0 rows |

### What is blocked

- The **Coverages tab** in `QuoteSectionViewPage` calls `GET /api/quotes/:id/sections/:sectionId/coverages` — this endpoint does not exist
- The **Coverages tab** in `PolicySectionViewPage` calls `GET /api/policies/:id/sections/:sectionId/coverages` — this endpoint exists but queries a non-existent table name (`policy_section_coverages` instead of `policy_coverages`), causing a 500
- All coverage detail pages return no data because there is no seed data for quote_sections or policy_sections

---

## Open Questions (must be answered before C0 starts)

### OQ-C-001: Table naming — rename or fix service?

**Question:** `policy_coverages` (migration 014's actual table name) is queried as `policy_section_coverages` in `policies.service.ts`. Two resolution options:

| Option | Action | Risk |
|--------|--------|------|
| A — Rename table | New migration renames `policy_coverages` → `policy_section_coverages` (consistent with the new `quote_section_coverages` pattern) | Very low — table is empty in all environments |
| B — Fix service | Change the two `policy_section_coverages` references in `policies.service.ts` + `policies.spec.ts` to `policy_coverages` | Very low — one-line change, no migration needed |

> **Recommendation: Option A** — gives consistent naming across both domains (`quote_section_coverages` / `policy_section_coverages`) and ensures the DB schema matches the requirements documentation which uses `policy_section_coverages`. Since the table is currently empty in all environments, the rename is zero-risk.

**Blocks:** C0, C1, C2, C3

### OQ-C-002: Policy coverages write API — in scope for Batch C?

**Question:** REQ-POL-BE-F-007 in reconstruction-gap-analysis requires POST/PUT/DELETE for policy coverages. The frontend `PolicySectionViewPage` Coverages tab is currently read-only. Should this batch implement the write operations, or should Batch C deliver read-only coverage display (GET only) and defer write operations to Batch D?

> **Recommendation: Defer POST/PUT/DELETE to Batch D.** The read path unblocks the key user journey (viewing coverage detail pages). Write operations require additional requirements and UI work (inline edit forms in the Coverages tab). Delivering GET first follows the incremental approach used throughout this project.

**Blocks:** C3 scope decision

---

## Delivery Sequence

> **Rule:** Every step below must complete before the next begins.  
> **Rule:** No code is written until the requirements and tests for that step are in place.  
> **Rule:** Checkpoint after every numbered step.

---

### C0 — Fix policy_section_coverages name mismatch

**Prerequisite:** OQ-C-001 answered (recommendation: Option A — rename via migration)

**Step C0-1: Migration 099 — rename `policy_coverages`**

Create `db/migrations/099-rename-policy-coverages-table.js`:

```sql
-- Rename table
ALTER TABLE policy_coverages RENAME TO policy_section_coverages;

-- Rename indexes so they follow idx_ naming convention
ALTER INDEX idx_policy_coverages_section_id RENAME TO idx_policy_section_coverages_section_id;
ALTER INDEX idx_policy_coverages_policy_id  RENAME TO idx_policy_section_coverages_policy_id;
```

Run locally, then UAT.

**Step C0-2: No service change needed** (service already uses `policy_section_coverages`)  
**Step C0-3: Update `policies.spec.ts`** — confirm the spec's `expect.stringContaining('policy_section_coverages')` assertion still passes (it should — no change needed, test was already written to the correct name)

---

### C1 — Migration 100: Create `quote_section_coverages`

**Prerequisite:** C0 complete  
**Requirements:** REQ-QUO-BE-F-041 (table must exist before endpoint implemented)

Create `db/migrations/100-create-quote-section-coverages-table.js`:

```sql
CREATE TABLE IF NOT EXISTS quote_section_coverages (
    id                      SERIAL PRIMARY KEY,
    quote_id                INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    section_id              INTEGER NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
    reference               TEXT,
    coverage_name           TEXT,
    class_of_business       TEXT,
    effective_date          DATE,
    expiry_date             DATE,
    days_on_cover           INTEGER,
    limit_currency          VARCHAR(8),
    limit_amount            NUMERIC(18,2),
    limit_loss_qualifier    TEXT,
    excess_currency         VARCHAR(8),
    excess_amount           NUMERIC(18,2),
    sum_insured_currency    VARCHAR(8),
    sum_insured             NUMERIC(18,2),
    premium_currency        VARCHAR(8),
    gross_premium           NUMERIC(18,2),
    net_premium             NUMERIC(18,2),
    tax_receivable          NUMERIC(18,2),
    payload                 JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_section_id ON quote_section_coverages (section_id);
CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_quote_id   ON quote_section_coverages (quote_id);
```

> **Note:** `days_on_cover` is server-computed when both `effective_date` and `expiry_date` are present (per REQ-QUO-BE-F-043). It is stored as a convenience column.  
> **Note:** `coverage_name` maps to the `coverage` column name used in `policy_section_coverages` — these must be reconciled. See OQ-C-003 below.

Run locally, then UAT. Add to `db:migrate` chain in `package.json`.

---

### C2 — Quote coverages API (NestJS)

**Prerequisite:** C1 complete (table exists)  
**Requirements already written:** REQ-QUO-BE-F-041 to F-044 in `backend/routes/quotes.requirements.md`

**Step C2-1: Update requirements reference** — Change "Prerequisite: migration 094 must create the `quote_section_coverages` table" in REQ-QUO-BE-F-041 to reference migration 100.

**Step C2-2: Write Layer 2 backend tests** (before code)

Add to `backend/__tests__/requirements/S13-quotes-coverages.test.js`:

| Test ID | Requirement | Scenario |
|---------|-------------|----------|
| T-QUO-BE-F-041-R01 | REQ-QUO-BE-F-041 | GET coverages returns 200 + array for valid section |
| T-QUO-BE-F-041-R02 | REQ-QUO-BE-F-041 | GET coverages returns 401 with no token |
| T-QUO-BE-F-041-R03 | REQ-QUO-BE-F-041 | GET coverages returns 403 for wrong org |
| T-QUO-BE-F-041-R04 | REQ-QUO-BE-F-041 | GET coverages returns 404 for unknown section |
| T-QUO-BE-F-042-R01 | REQ-QUO-BE-F-042 | POST creates coverage with auto-generated reference `{sectionRef}-COV-001` |
| T-QUO-BE-F-042-R02 | REQ-QUO-BE-F-042 | POST returns 201 with created record |
| T-QUO-BE-F-042-R03 | REQ-QUO-BE-F-042 | POST returns 401 / 403 / 404 as expected |
| T-QUO-BE-F-043-R01 | REQ-QUO-BE-F-043 | PUT updates mutable fields; returns 200 |
| T-QUO-BE-F-043-R02 | REQ-QUO-BE-F-043 | PUT with effective_date + expiry_date computes days_on_cover |
| T-QUO-BE-F-043-R03 | REQ-QUO-BE-F-043 | PUT returns 404 for unknown coverage |
| T-QUO-BE-F-044-R01 | REQ-QUO-BE-F-044 | DELETE soft-deletes (sets deleted_at); returns 204 |
| T-QUO-BE-F-044-R02 | REQ-QUO-BE-F-044 | GET excludes soft-deleted coverages |

**Step C2-3: Implement in NestJS**

Add to `backend/nest/src/quotes/quotes.service.ts`:
- `getCoverages(quoteId, sectionId, orgCode)` → `SELECT * FROM quote_section_coverages WHERE section_id = $1 AND quote_id = $2 AND deleted_at IS NULL ORDER BY id`
- `createCoverage(quoteId, sectionId, orgCode, body)` → auto-reference logic + INSERT
- `updateCoverage(quoteId, sectionId, coverageId, orgCode, body)` → UPDATE with days_on_cover computed when dates present
- `deleteCoverage(quoteId, sectionId, coverageId, orgCode)` → soft delete

Add to `backend/nest/src/quotes/quotes.controller.ts`:
- `GET  /api/quotes/:id/sections/:sectionId/coverages`
- `POST /api/quotes/:id/sections/:sectionId/coverages`
- `PUT  /api/quotes/:id/sections/:sectionId/coverages/:coverageId`
- `DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId`

Add to `backend/nest/src/quotes/quotes.spec.ts`:
- Unit tests for the four new service methods

---

### C3 — Policy coverages GET fix + (deferred: write API)

**Prerequisite:** C0 complete (table renamed)  
**Scope (per OQ-C-002 recommendation):** GET fix only in Batch C; write API deferred to Batch D

**Step C3-1:** Verify `getCoverages` in `policies.service.ts` now queries the correct table name after the C0 rename. No code change required — only confirm the service is working.

**Step C3-2:** Add Layer 2 test for GET policy coverages in `backend/__tests__/requirements/S14-policies-coverages.test.js`:
- `GET /api/policies/:id/sections/:sectionId/coverages` returns 200 with empty array when no coverages exist
- Returns 401 / 403 / 404 as expected

**Step C3-3:** Add NestJS unit test in `policies.spec.ts` — confirm `getCoverages` actually returns rows from `policy_section_coverages`.

---

### C4 — Seed data

**Prerequisite:** C0 and C1 complete (both tables exist with correct names)

**Step C4-1: `027-quote-sections.js`**

Seeds 2–3 sections per quote (QUO-2024-001 through QUO-2025-001):
- Each section has: `reference` (`{quoteRef}-SEC-001`), `class_of_business`, `inception_date`, `expiry_date`, `days_on_cover`, `sum_insured_currency`, `sum_insured`, `gross_premium`, `net_premium`
- Mix of Property, Casualty, Marine classes
- Currencies: GBP, USD, EUR

**Step C4-2: `028-policy-sections.js`**

Seeds 1–2 sections per policy (POL-2024-001 through POL-2025-001):
- Mirrors the section structure of corresponding quotes
- `inception_date` / `expiry_date` match the policy

**Step C4-3: `029-quote-section-coverages.js`**

Seeds 2 coverages per quote section:
- `coverage_name`: e.g. "Property Damage", "Business Interruption"
- `reference`: `{sectionRef}-COV-001`, `{sectionRef}-COV-002`
- `limit_currency`, `limit_amount`, `sum_insured`

**Step C4-4: `030-policy-section-coverages.js`**

Seeds equivalent coverages for each policy section.

**Step C4-5:** Add new seed files to the `db:seed` chain in `package.json`

**Step C4-6:** Run seeds locally; verify row counts. Run seeds against UAT.

---

### C5 — Update requirements files and traceability table

**Prerequisite:** C2 and C3 complete

**Step C5-1:** In `backend/routes/quotes.requirements.md` §3.13–3.16:
- Update the prerequisite note in REQ-QUO-BE-F-041 from "migration 094" to "migration 100"
- Change traceability table entries for F-041 to F-044 from `pending` to `complete`

**Step C5-2:** In `backend/nest/src/policies/policies.requirements.md` (once located):
- Update REQ-POL-BE-F-014 to note table renamed from `policy_coverages` → `policy_section_coverages` via migration 099

**Step C5-3:** Update `docs/Technical Documentation/11-Gap-Analysis.md` to reflect:
- `quote_section_coverages` table now exists (migration 100)
- `policy_coverages` renamed to `policy_section_coverages` (migration 099)
- Quote coverages API endpoints implemented

---

## Additional Open Questions

### OQ-C-003: `coverage_name` vs `coverage` column name

The `policy_section_coverages` table (from migration 014 + rename) uses `coverage TEXT` as the column name.  
The `QuoteCoverageDetailPage` frontend code references `coverage.coverage_name`.  
The proposed `quote_section_coverages` schema above uses `coverage_name TEXT`.

**Question:** Should both tables use `coverage_name`, or `coverage`? They should be consistent.

> **Recommendation:** Use `coverage_name` in `quote_section_coverages` (new table, no migration cost) and add a migration to rename `coverage` → `coverage_name` in `policy_section_coverages`. This matches the frontend field name and is more explicit.

**Blocks:** C1 final schema, C4 seed files

### OQ-C-004: `days_on_cover` in `policy_section_coverages`

Migration 014 (`policy_coverages`) does not include a `days_on_cover` column, but the equivalent `quote_sections` table has it. Should `policy_section_coverages` also have `days_on_cover`?

> **Recommendation:** Yes — add it in the rename migration (C0-1) via `ALTER TABLE ... ADD COLUMN days_on_cover INTEGER`. Consistent with `quote_section_coverages` and `quote_sections`.

---

## Impact Analysis

### DB Impact

| Migration | Change |
|-----------|--------|
| 099 | Rename `policy_coverages` → `policy_section_coverages`; rename indexes; optionally add `days_on_cover` |
| 100 | Create `quote_section_coverages` table with indexes |

### API Impact

| Method | Path | Status after Batch C |
|--------|------|----------------------|
| GET | `/api/quotes/:id/sections/:sectionId/coverages` | ✅ New |
| POST | `/api/quotes/:id/sections/:sectionId/coverages` | ✅ New |
| PUT | `/api/quotes/:id/sections/:sectionId/coverages/:coverageId` | ✅ New |
| DELETE | `/api/quotes/:id/sections/:sectionId/coverages/:coverageId` | ✅ New |
| GET | `/api/policies/:id/sections/:sectionId/coverages` | ✅ Fixed (was 500) |

### UI / Front-End Impact

No new frontend files required. All four coverage pages already exist:
- `QuoteSectionViewPage` Coverages tab — will become functional (currently empty) ✅
- `QuoteCoverageDetailPage` — will render real data ✅
- `QuoteCoverageSubDetailPage` — will render real data ✅
- `PolicySectionViewPage` Coverages tab — will become functional ✅
- `PolicyCoverageDetailPage` — will render real data ✅
- `PolicyCoverageSubDetailPage` — will render real data ✅

---

## Deferred to Batch D

| Item | Reason |
|------|--------|
| Policy coverages POST / PUT / DELETE | Requires additional requirements detail and inline-edit UI for Coverages tab — not needed for read-only display path |
| Finance domain tables (`finance_invoices`, `finance_payments`, `finance_cash_batches`) | Not in Cleaned schema yet — full finance domain sprint needed |
| Production database migrations | User decision: do not run in Production yet |
| Claims seed data | Lower priority than sections/coverages |

---

## CHECKPOINT — Before Work Begins

**Please confirm the following before any files are created:**

1. **OQ-C-001:** Do you approve Option A (rename `policy_coverages` → `policy_section_coverages` via migration 099)?
2. **OQ-C-002:** Confirmed — defer policy coverages write API (POST/PUT/DELETE) to Batch D?
3. **OQ-C-003:** Use `coverage_name` in both tables (rename `coverage` column in policy_section_coverages)?
4. **OQ-C-004:** Add `days_on_cover` to `policy_section_coverages` during the rename migration?
5. Is the proposed seed structure (027 quote_sections → 028 policy_sections → 029 QSC → 030 PSC) correct?

I will not begin any implementation work until these are confirmed.

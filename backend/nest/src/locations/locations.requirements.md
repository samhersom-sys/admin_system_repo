# Location Schedule — Backend Requirements

**Domain:** LOC-BE  
**Requirement format:** REQ-LOC-BE-NE-F-NNN  
**Date:** 2026-05-29

---

## 1. Existing endpoints (Block 1 — already implemented)

| ID | Endpoint | Description |
|----|----------|-------------|
| REQ-LOC-BE-NE-F-001 | GET /api/locations-schedule/imports | List active JSONB version records for entity |
| REQ-LOC-BE-NE-F-002 | POST /api/locations-schedule/import | Insert new JSONB version from parsed rows |
| REQ-LOC-BE-NE-F-003 | PUT /api/locations-schedule/imports/:id | Update payload of a version record |
| REQ-LOC-BE-NE-F-004 | GET /api/locations-schedule/imports/:id/versions | List all version records for an import |
| REQ-LOC-BE-NE-F-005 | POST /api/locations-schedule/imports/:id/revert/:versionNumber | Revert to a previous version |
| REQ-LOC-BE-NE-F-006 | GET /api/locations-schedule/imports/:id/historical | List all versions including inactive |
| REQ-LOC-BE-NE-F-007 | GET /api/quotes/:id/locations | Read from `quote_location_rows` VIEW |
| REQ-LOC-BE-NE-F-008 | GET /api/policies/:id/locations | Read from `policy_location_rows` VIEW |

---

## 2. Block 2 — Normalised CRUD + DB views

### REQ-LOC-BE-NE-F-009 — DB View: quote_location_rows
A PostgreSQL VIEW `quote_location_rows` MUST be created (in seed `037-location-views.js`) as:

```sql
CREATE OR REPLACE VIEW quote_location_rows AS
SELECT
    lc.id,
    l.quote_id,
    l.id        AS location_id,
    l.country,  l.country_code,
    l.state,    l.state_code,
    l.city,
    l.address1, l.address2, l.address3,
    l.zip_code,
    lc.section_id,
    lc.coverage_type,   lc.coverage_type_id,
    lc.coverage_sub_type, lc.coverage_sub_type_id,
    lc.currency,
    lc.sum_insured,
    lc.movement,
    lc.base_rate,
    lc.final_rate,
    lc.premium,
    lc.annual_rated_gross_premium,
    lc.rating_schedule_id,
    lc.calculation_method,
    lc.last_calculated,
    lc.is_bound,
    lc.version_id,
    lc.created_at,
    lc.updated_at
FROM locations l
JOIN location_coverages lc ON lc.location_id = l.id;
```

### REQ-LOC-BE-NE-F-010 — DB View: policy_location_rows
A PostgreSQL VIEW `policy_location_rows` MUST be created (same seed) as:

```sql
CREATE OR REPLACE VIEW policy_location_rows AS
SELECT
    id, policy_id, section_id, version,
    country, country_code, state, state_code,
    city, address1, address2, address3, zip_code,
    coverage_type, coverage_type_id,
    coverage_sub_type, coverage_sub_type_id,
    currency, sum_insured, movement,
    is_active, created_at, created_by
FROM policy_location_schedule_rows;
```

### REQ-LOC-BE-NE-F-011 — POST /api/quotes/:id/locations/rows
Creates a new row in `locations` table.  
- Guard: quote must exist AND belong to caller's org.  
- Guard: quote status must be `'Created'` or `'Quoted'`.  
- Body: `{ country?, country_code?, state?, state_code?, city?, address1?, address2?, address3?, zip_code? }`  
- Returns: created location row (all fields).

### REQ-LOC-BE-NE-F-012 — PUT /api/quotes/:id/locations/rows/:locationId
Updates an existing location row.  
- Same guards as F-011.  
- Body: same optional fields.  
- Returns: updated row.  
- Throws NotFoundException if location row not found for the given quoteId.

### REQ-LOC-BE-NE-F-013 — DELETE /api/quotes/:id/locations/rows/:locationId
Deletes a location row AND all its `location_coverages` rows (cascade via DB or explicit delete).  
- Same guards as F-011.  
- Returns: `{ message: 'Location deleted' }`.

### REQ-LOC-BE-NE-F-014 — POST /api/quotes/:id/locations/rows/:locationId/coverages
Adds a `location_coverages` row for the given location.  
- Guard: quote must exist and belong to org; status `Created` or `Quoted`.  
- Body: `{ section_id?, coverage_type?, coverage_sub_type?, coverage_type_id?, coverage_sub_type_id?, currency?, sum_insured?, rating_schedule_id? }`  
- Returns: created coverage row.

### REQ-LOC-BE-NE-F-015 — PUT /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId
Updates a `location_coverages` row.  
- Same guards as F-014.  
- Body: same optional fields.  
- Returns: updated row.

### REQ-LOC-BE-NE-F-016 — DELETE /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId
Deletes a single `location_coverages` row.  
- Same guards as F-014.  
- Returns: `{ message: 'Coverage row deleted' }`.

### REQ-LOC-BE-NE-F-017 — POST /api/locations-schedule/imports/:quoteId/save-version
Snapshots the current `quote_location_rows` for the given quoteId into `locations_schedule_versions`.  
- Reads current rows via `SELECT * FROM quote_location_rows WHERE quote_id = $1`.  
- Inserts a new `locations_schedule_versions` record with `import_id = quoteId`, incrementing `version_number`.  
- Marks previous active versions `is_active = FALSE` for this import.  
- Sets new record `is_active = TRUE`.  
- Returns: `{ id, versionNumber, createdAt }`.

---

## 3. Test coverage

| Requirement | Test IDs |
|-------------|----------|
| F-009 (view creation) | seed integration test |
| F-010 (view creation) | seed integration test |
| F-011 POST location | T-LOC-BE-NE-R11a (happy path), R11b (locked quote), R11c (not found) |
| F-012 PUT location | T-LOC-BE-NE-R12a (happy path), R12b (not found), R12c (locked) |
| F-013 DELETE location | T-LOC-BE-NE-R13a (happy path), R13b (not found) |
| F-014 POST coverage | T-LOC-BE-NE-R14a (happy path), R14b (locked quote) |
| F-015 PUT coverage | T-LOC-BE-NE-R15a (happy path), R15b (not found) |
| F-016 DELETE coverage | T-LOC-BE-NE-R16a (happy path), R16b (not found) |
| F-017 save-version | T-LOC-BE-NE-R17a (inserts snapshot), R17b (increments version) |

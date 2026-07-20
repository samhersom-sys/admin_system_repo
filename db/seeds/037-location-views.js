'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

/**
 * Seed 037 — Location schedule tables + views
 *
 * REQ-LOC-BE-NE-F-009 — creates quote_location_rows VIEW
 * REQ-LOC-BE-NE-F-010 — creates policy_location_rows VIEW
 *
 * Also ensures that the four normalised/versioning tables exist so that
 * fresh installs (where TypeORM synchronize may not have run yet) can use
 * the views immediately.
 *
 * Safe to re-run (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE VIEW).
 */

async function run() {
    const client = await pool.connect()
    try {
        console.log('[037] Ensuring location tables exist ...')

        // -----------------------------------------------------------------------
        // 1. locations — physical address per quote
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id             SERIAL PRIMARY KEY,
                quote_id       INTEGER NOT NULL,
                country        VARCHAR(100),
                country_code   VARCHAR(3),
                state          VARCHAR(100),
                state_code     VARCHAR(10),
                city           VARCHAR(200),
                address1       TEXT,
                address2       TEXT,
                address3       TEXT,
                zip_code       VARCHAR(20),
                created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by     VARCHAR(255),
                updated_at     TIMESTAMPTZ,
                updated_by     VARCHAR(255)
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_locations_quote_id
                ON locations (quote_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_locations_country_code
                ON locations (country_code)
        `)
        console.log('[037]   locations table OK')

        // -----------------------------------------------------------------------
        // 2. location_coverages — coverage row per location × section × type
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_coverages (
                id                          SERIAL PRIMARY KEY,
                location_id                 INTEGER NOT NULL,
                quote_id                    INTEGER NOT NULL,
                version_id                  INTEGER,
                section_id                  INTEGER,
                policy_id                   INTEGER,
                coverage_type_id            INTEGER,
                coverage_sub_type_id        INTEGER,
                coverage_type               TEXT,
                coverage_sub_type           TEXT,
                currency                    VARCHAR(8)     NOT NULL DEFAULT 'GBP',
                sum_insured                 NUMERIC(15,2)  NOT NULL DEFAULT 0,
                movement                    NUMERIC(15,2)  NOT NULL DEFAULT 0,
                is_bound                    BOOLEAN        NOT NULL DEFAULT FALSE,
                base_rate                   NUMERIC(10,5),
                final_rate                  NUMERIC(10,5),
                premium                     NUMERIC(18,2),
                annual_rated_gross_premium  NUMERIC(18,2),
                rating_schedule_id          INTEGER,
                calculation_method          VARCHAR(50),
                last_calculated             TIMESTAMPTZ,
                created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                  VARCHAR(255),
                updated_at                  TIMESTAMPTZ,
                updated_by                  VARCHAR(255)
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_location_coverages_location
                ON location_coverages (location_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_location_coverages_quote
                ON location_coverages (quote_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_location_coverages_section
                ON location_coverages (section_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_location_coverages_rating_schedule
                ON location_coverages (rating_schedule_id)
        `)
        console.log('[037]   location_coverages table OK')

        // -----------------------------------------------------------------------
        // 3. locations_schedule_versions — JSONB snapshots per entity (quote/policy)
        //    import_id = quoteId or policyId depending on context
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations_schedule_versions (
                id              SERIAL PRIMARY KEY,
                import_id       INTEGER NOT NULL,
                version_number  INTEGER NOT NULL,
                payload         JSONB   NOT NULL DEFAULT '{}',
                created_by      VARCHAR(255),
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                is_active       BOOLEAN NOT NULL DEFAULT TRUE
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_locations_schedule_versions_import
                ON locations_schedule_versions (import_id)
        `)
        console.log('[037]   locations_schedule_versions table OK')

        // -----------------------------------------------------------------------
        // 4. policy_location_schedule_rows — denormalised snapshot at policy bind
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_location_schedule_rows (
                id                   SERIAL PRIMARY KEY,
                policy_id            INTEGER NOT NULL,
                section_id           INTEGER,
                version              INTEGER NOT NULL DEFAULT 1,
                country              TEXT,
                country_code         VARCHAR(3),
                state                TEXT,
                state_code           VARCHAR(10),
                address1             TEXT,
                address2             TEXT,
                address3             TEXT,
                city                 TEXT,
                zip_code             VARCHAR(20),
                coverage_type        TEXT,
                coverage_type_id     INTEGER,
                coverage_sub_type    TEXT,
                coverage_sub_type_id INTEGER,
                sum_insured          NUMERIC(18,2),
                currency             VARCHAR(8) NOT NULL DEFAULT 'GBP',
                movement             NUMERIC(18,2) NOT NULL DEFAULT 0,
                is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by           TEXT,
                updated_at           TIMESTAMPTZ,
                updated_by           TEXT
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_policy
                ON policy_location_schedule_rows (policy_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_section
                ON policy_location_schedule_rows (section_id)
        `)
        console.log('[037]   policy_location_schedule_rows table OK')

        // -----------------------------------------------------------------------
        // 5. CREATE OR REPLACE VIEW: quote_location_rows
        //    REQ-LOC-BE-NE-F-009
        //    Joins locations + location_coverages — one row per coverage entry.
        //    Queried by QuotesService.getLocations() with WHERE quote_id = $1.
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE OR REPLACE VIEW quote_location_rows AS
            SELECT
                lc.id,
                l.quote_id,
                l.id                        AS location_id,
                l.country,
                l.country_code,
                l.state,
                l.state_code,
                l.city,
                l.address1,
                l.address2,
                l.address3,
                l.zip_code,
                lc.section_id,
                lc.coverage_type,
                lc.coverage_type_id,
                lc.coverage_sub_type,
                lc.coverage_sub_type_id,
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
            JOIN location_coverages lc ON lc.location_id = l.id
        `)
        console.log('[037]   quote_location_rows VIEW OK')

        // -----------------------------------------------------------------------
        // 6. CREATE OR REPLACE VIEW: policy_location_rows
        //    REQ-LOC-BE-NE-F-010
        //    Flat select from policy_location_schedule_rows.
        //    Queried by PoliciesService.getLocations() with WHERE policy_id = $1.
        // -----------------------------------------------------------------------
        await client.query(`
            CREATE OR REPLACE VIEW policy_location_rows AS
            SELECT
                id,
                policy_id,
                section_id,
                version,
                country,
                country_code,
                state,
                state_code,
                city,
                address1,
                address2,
                address3,
                zip_code,
                coverage_type,
                coverage_type_id,
                coverage_sub_type,
                coverage_sub_type_id,
                currency,
                sum_insured,
                movement,
                is_active,
                created_at,
                created_by
            FROM policy_location_schedule_rows
        `)
        console.log('[037]   policy_location_rows VIEW OK')

        console.log('[037] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[037] Error:', err.message)
    process.exit(1)
})

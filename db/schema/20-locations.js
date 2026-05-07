'use strict'
/**
 * Schema 20: locations tables
 * Replaces migrations: 070-create-locations-table, 071-create-location-coverages-table,
 *                      120-add-location-coverages-calc-columns,
 *                      072-create-locations-schedule-versions-table,
 *                      073-create-policy-location-schedule-rows-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[20-locations] Creating location tables...')

        // locations (070)
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id           SERIAL PRIMARY KEY,
                quote_id     INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                country      VARCHAR(100),
                country_code VARCHAR(3),
                state        VARCHAR(100),
                state_code   VARCHAR(10),
                city         VARCHAR(200),
                address1     TEXT,
                address2     TEXT,
                address3     TEXT,
                zip_code     VARCHAR(20),
                created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by   VARCHAR(255),
                updated_at   TIMESTAMP WITH TIME ZONE,
                updated_by   VARCHAR(255),
                CONSTRAINT uq_locations_quote_address UNIQUE (quote_id, country, state, city, address1, address2, address3)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_quote_id    ON locations (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_country_code ON locations (country_code)`)

        // location_coverages (071 + 120)
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_coverages (
                id                          SERIAL PRIMARY KEY,
                location_id                 INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                quote_id                    INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                version_id                  INTEGER NOT NULL,
                section_id                  INTEGER REFERENCES quote_sections(id) ON DELETE SET NULL,
                policy_id                   INTEGER REFERENCES policies(id) ON DELETE SET NULL,
                coverage_type_id            INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE SET NULL,
                coverage_sub_type_id        INTEGER REFERENCES lookup_coverage_detail_sub_types(id) ON DELETE SET NULL,
                coverage_type               TEXT,
                coverage_sub_type           TEXT,
                currency                    VARCHAR(8) DEFAULT 'GBP',
                sum_insured                 NUMERIC(15,2) DEFAULT 0,
                movement                    NUMERIC(15,2) DEFAULT 0,
                is_bound                    BOOLEAN DEFAULT FALSE,
                created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by                  VARCHAR(255),
                updated_at                  TIMESTAMP WITH TIME ZONE,
                updated_by                  VARCHAR(255),
                base_rate                   NUMERIC(10,5),
                final_rate                  NUMERIC(10,5),
                premium                     NUMERIC(18,2),
                annual_rated_gross_premium  NUMERIC(18,2),
                rating_schedule_id          INTEGER REFERENCES rating_schedules(id) ON DELETE SET NULL,
                calculation_method          VARCHAR(50),
                last_calculated             TIMESTAMP WITH TIME ZONE,
                CONSTRAINT uq_location_coverages_unique UNIQUE (location_id, version_id, coverage_type_id, coverage_sub_type_id, currency)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_location        ON location_coverages (location_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_quote           ON location_coverages (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_version        ON location_coverages (version_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_section         ON location_coverages (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_rating_schedule ON location_coverages (rating_schedule_id)`)

        // Idempotent additions for environments using partial schemas
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS base_rate                  NUMERIC(10,5)`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS final_rate                 NUMERIC(10,5)`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS premium                    NUMERIC(18,2)`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS annual_rated_gross_premium NUMERIC(18,2)`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS rating_schedule_id         INTEGER REFERENCES rating_schedules(id) ON DELETE SET NULL`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS calculation_method         VARCHAR(50)`)
        await client.query(`ALTER TABLE location_coverages ADD COLUMN IF NOT EXISTS last_calculated            TIMESTAMP WITH TIME ZONE`)

        // locations_schedule_versions (072)
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations_schedule_versions (
                id             SERIAL PRIMARY KEY,
                import_id      INTEGER NOT NULL,
                version_number INTEGER NOT NULL,
                payload        JSONB   NOT NULL,
                created_by     VARCHAR(255),
                created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active      BOOLEAN DEFAULT TRUE
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_schedule_versions_import  ON locations_schedule_versions (import_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_schedule_versions_active  ON locations_schedule_versions (import_id, is_active) WHERE is_active = TRUE`)

        // policy_location_schedule_rows (073)
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_location_schedule_rows (
                id                   SERIAL PRIMARY KEY,
                policy_id            INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
                section_id           INTEGER REFERENCES policy_sections(id) ON DELETE SET NULL,
                version              INTEGER DEFAULT 1,
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
                coverage_sub_type    TEXT,
                coverage_type_id     INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE SET NULL,
                coverage_sub_type_id INTEGER REFERENCES lookup_coverage_detail_sub_types(id) ON DELETE SET NULL,
                sum_insured          NUMERIC(18,2),
                currency             VARCHAR(8) DEFAULT 'GBP',
                movement             NUMERIC(18,2) DEFAULT 0,
                is_active            BOOLEAN DEFAULT TRUE,
                created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by           VARCHAR(255),
                updated_at           TIMESTAMP WITH TIME ZONE,
                updated_by           VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_policy  ON policy_location_schedule_rows (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_section ON policy_location_schedule_rows (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_version ON policy_location_schedule_rows (version)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_active  ON policy_location_schedule_rows (is_active)`)

        console.log('[20-locations] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[20-locations] ERROR:', err.message); process.exit(1) })

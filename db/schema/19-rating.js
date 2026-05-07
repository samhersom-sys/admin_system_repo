'use strict'
/**
 * Schema 19: rating tables
 * Replaces migrations: 054-create-rating-schedules-table, 118-add-rating-schedules-columns,
 *                      055-create-rating-rules-table, 119-add-rating-rules-group-columns,
 *                      056-create-location-premium-calculations-table,
 *                      057-create-location-premium-adjustments-table,
 *                      058-create-rating-schedule-binding-authorities-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[19-rating] Creating rating tables...')

        // rating_schedules (054 + 118)
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_schedules (
                id                           SERIAL PRIMARY KEY,
                name                         VARCHAR(255) NOT NULL,
                description                  TEXT,
                binding_authority_section_id INTEGER REFERENCES binding_authority_sections(id) ON DELETE SET NULL,
                effective_date               DATE,
                expiry_date                  DATE,
                currency                     VARCHAR(3) NOT NULL DEFAULT 'GBP',
                is_active                    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                   VARCHAR(255),
                updated_at                   TIMESTAMPTZ,
                updated_by                   VARCHAR(255),
                placement_methods            TEXT[] DEFAULT '{}',
                version                      INTEGER DEFAULT 1,
                parent_schedule_id           INTEGER REFERENCES rating_schedules(id) ON DELETE SET NULL,
                last_modified_date           TIMESTAMP WITH TIME ZONE,
                last_modified_by             VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_schedules_ba_section_id    ON rating_schedules (binding_authority_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_schedules_placement_methods ON rating_schedules USING GIN (placement_methods)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_schedules_parent            ON rating_schedules (parent_schedule_id)`)

        // Idempotent additions for environments using partial schemas
        await client.query(`ALTER TABLE rating_schedules ADD COLUMN IF NOT EXISTS placement_methods   TEXT[] DEFAULT '{}'`)
        await client.query(`ALTER TABLE rating_schedules ADD COLUMN IF NOT EXISTS version             INTEGER DEFAULT 1`)
        await client.query(`ALTER TABLE rating_schedules ADD COLUMN IF NOT EXISTS parent_schedule_id  INTEGER REFERENCES rating_schedules(id) ON DELETE SET NULL`)
        await client.query(`ALTER TABLE rating_schedules ADD COLUMN IF NOT EXISTS last_modified_date  TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE rating_schedules ADD COLUMN IF NOT EXISTS last_modified_by    VARCHAR(255)`)

        // rating_rules (055 + 119)
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_rules (
                id                   SERIAL PRIMARY KEY,
                rating_schedule_id   INTEGER NOT NULL REFERENCES rating_schedules(id) ON DELETE CASCADE,
                rule_name            VARCHAR(255),
                description          TEXT,
                field_name           VARCHAR(100) NOT NULL,
                field_source         VARCHAR(50) NOT NULL,
                operator             VARCHAR(20) NOT NULL,
                field_value          TEXT,
                rate_percentage      NUMERIC(10,5) NOT NULL,
                rate_type            VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
                coverage_type_id     INTEGER,
                coverage_sub_type_id INTEGER,
                priority             INTEGER NOT NULL DEFAULT 100,
                is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by           VARCHAR(255),
                updated_at           TIMESTAMPTZ,
                updated_by           VARCHAR(255),
                rule_group           VARCHAR(100),
                group_number         INTEGER DEFAULT 1,
                logical_operator     VARCHAR(10) DEFAULT 'AND',
                sequence_in_group    INTEGER DEFAULT 1
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_rules_schedule_id ON rating_rules (rating_schedule_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_rules_group       ON rating_rules (rating_schedule_id, group_number, sequence_in_group)`)

        await client.query(`ALTER TABLE rating_rules ADD COLUMN IF NOT EXISTS rule_group        VARCHAR(100)`)
        await client.query(`ALTER TABLE rating_rules ADD COLUMN IF NOT EXISTS group_number      INTEGER DEFAULT 1`)
        await client.query(`ALTER TABLE rating_rules ADD COLUMN IF NOT EXISTS logical_operator  VARCHAR(10) DEFAULT 'AND'`)
        await client.query(`ALTER TABLE rating_rules ADD COLUMN IF NOT EXISTS sequence_in_group INTEGER DEFAULT 1`)

        // location_premium_calculations (056)
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_premium_calculations (
                id                    SERIAL PRIMARY KEY,
                quote_id              INTEGER,
                section_id            INTEGER,
                coverage_id           INTEGER,
                coverage_detail_id    INTEGER,
                coverage_sub_type_id  INTEGER,
                location_id           INTEGER,
                rating_schedule_id    INTEGER REFERENCES rating_schedules(id) ON DELETE SET NULL,
                rating_rule_id        INTEGER REFERENCES rating_rules(id) ON DELETE SET NULL,
                sum_insured           NUMERIC(15,2) NOT NULL,
                currency              VARCHAR(3) NOT NULL,
                rate_percentage       NUMERIC(10,5) NOT NULL,
                gross_annual_premium  NUMERIC(15,2) NOT NULL,
                fixed_fees_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
                discounts_total       NUMERIC(15,2) NOT NULL DEFAULT 0,
                net_annual_premium    NUMERIC(15,2) NOT NULL,
                calculation_notes     TEXT,
                calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                calculated_by         VARCHAR(255),
                version_id            INTEGER
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_calc_quote_id          ON location_premium_calculations (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_calc_rating_schedule_id ON location_premium_calculations (rating_schedule_id)`)

        // location_premium_adjustments (057)
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_premium_adjustments (
                id                  SERIAL PRIMARY KEY,
                location_premium_id INTEGER NOT NULL REFERENCES location_premium_calculations(id) ON DELETE CASCADE,
                adjustment_type     VARCHAR(20) NOT NULL,
                description         TEXT,
                percentage          NUMERIC(8,5),
                fixed_amount        NUMERIC(15,2),
                calculated_amount   NUMERIC(15,2) NOT NULL,
                applied_at_level    VARCHAR(50),
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by          VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_adjustments_premium_id ON location_premium_adjustments (location_premium_id)`)

        // rating_schedule_binding_authorities (058)
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_schedule_binding_authorities (
                id                           SERIAL PRIMARY KEY,
                rating_schedule_id           INTEGER NOT NULL REFERENCES rating_schedules(id) ON DELETE CASCADE,
                binding_authority_id         INTEGER REFERENCES binding_authorities(id) ON DELETE CASCADE,
                binding_authority_section_id INTEGER REFERENCES binding_authority_sections(id) ON DELETE CASCADE,
                created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                   INTEGER
            )
        `)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_rsba_schedule_ba_section ON rating_schedule_binding_authorities (rating_schedule_id, binding_authority_section_id)`)
        await client.query(`CREATE INDEX        IF NOT EXISTS idx_rsba_schedule_id        ON rating_schedule_binding_authorities (rating_schedule_id)`)
        await client.query(`CREATE INDEX        IF NOT EXISTS idx_rsba_ba_section_id      ON rating_schedule_binding_authorities (binding_authority_section_id)`)

        console.log('[19-rating] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[19-rating] ERROR:', err.message); process.exit(1) })

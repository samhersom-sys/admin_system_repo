'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_calc_quote_id ON location_premium_calculations (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_calc_rating_schedule_id ON location_premium_calculations (rating_schedule_id)`)
        console.log('[056] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[056] ERROR:', err.message); process.exit(1) })

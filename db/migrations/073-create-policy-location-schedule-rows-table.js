'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_location_schedule_rows (
                id                      SERIAL PRIMARY KEY,
                policy_id               INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
                section_id              INTEGER REFERENCES policy_sections(id) ON DELETE SET NULL,
                version                 INTEGER DEFAULT 1,
                country                 TEXT,
                country_code            VARCHAR(3),
                state                   TEXT,
                state_code              VARCHAR(10),
                address1                TEXT,
                address2                TEXT,
                address3                TEXT,
                city                    TEXT,
                zip_code                VARCHAR(20),
                coverage_type           TEXT,
                coverage_sub_type       TEXT,
                coverage_type_id        INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE SET NULL,
                coverage_sub_type_id    INTEGER REFERENCES lookup_coverage_detail_sub_types(id) ON DELETE SET NULL,
                sum_insured             NUMERIC(18,2),
                currency                VARCHAR(8) DEFAULT 'GBP',
                movement                NUMERIC(18,2) DEFAULT 0,
                is_active               BOOLEAN DEFAULT TRUE,
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by              VARCHAR(255),
                updated_at              TIMESTAMP WITH TIME ZONE,
                updated_by              VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_policy ON policy_location_schedule_rows (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_section ON policy_location_schedule_rows (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_version ON policy_location_schedule_rows (version)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_location_schedule_rows_active ON policy_location_schedule_rows (is_active)`)
        console.log('[073] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[073] ERROR:', err.message); process.exit(1) })

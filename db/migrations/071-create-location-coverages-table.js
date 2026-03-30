'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_coverages (
                id                      SERIAL PRIMARY KEY,
                location_id             INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                quote_id                INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                version_id              INTEGER NOT NULL,
                section_id              INTEGER REFERENCES quote_sections(id) ON DELETE SET NULL,
                policy_id               INTEGER REFERENCES policies(id) ON DELETE SET NULL,
                coverage_type_id        INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE SET NULL,
                coverage_sub_type_id    INTEGER REFERENCES lookup_coverage_detail_sub_types(id) ON DELETE SET NULL,
                coverage_type           TEXT,
                coverage_sub_type       TEXT,
                currency                VARCHAR(8) DEFAULT 'GBP',
                sum_insured             NUMERIC(15,2) DEFAULT 0,
                movement                NUMERIC(15,2) DEFAULT 0,
                is_bound                BOOLEAN DEFAULT FALSE,
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by              VARCHAR(255),
                updated_at              TIMESTAMP WITH TIME ZONE,
                updated_by              VARCHAR(255),
                CONSTRAINT uq_location_coverages_unique UNIQUE (location_id, version_id, coverage_type_id, coverage_sub_type_id, currency)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_location ON location_coverages (location_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_quote ON location_coverages (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_version ON location_coverages (version_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_location_coverages_section ON location_coverages (section_id)`)
        console.log('[071] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[071] ERROR:', err.message); process.exit(1) })

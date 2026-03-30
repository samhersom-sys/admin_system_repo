'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_coverage_detail_sub_types (
                id                    SERIAL PRIMARY KEY,
                coverage_detail_type_id INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE CASCADE,
                code                  TEXT,
                name                  TEXT NOT NULL,
                description           TEXT,
                active                BOOLEAN NOT NULL DEFAULT TRUE,
                display_order         INTEGER,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverage_detail_sub_types_detail ON lookup_coverage_detail_sub_types (coverage_detail_type_id)`)
        console.log('[045] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[045] ERROR:', err.message); process.exit(1) })

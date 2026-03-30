'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_regions (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                name         VARCHAR(100) NOT NULL,
                sort_order   INTEGER NOT NULL DEFAULT 0,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_regions_country_code ON lookup_regions (country_code)`)
        console.log('[048] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[048] ERROR:', err.message); process.exit(1) })

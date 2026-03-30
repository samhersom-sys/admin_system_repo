'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_sic_codes (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                code         VARCHAR(20) NOT NULL,
                description  TEXT NOT NULL,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_sic_codes_country_code ON lookup_sic_codes (country_code)`)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lookup_sic_codes ON lookup_sic_codes (country_code, code)`)
        console.log('[050] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[050] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_risk_codes (
                id                   SERIAL PRIMARY KEY,
                code                 VARCHAR(20) NOT NULL UNIQUE,
                description          TEXT,
                first_year_of_account INTEGER,
                last_year_of_account  INTEGER,
                is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_risk_codes_code ON lookup_risk_codes (code)`)
        console.log('[051] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[051] ERROR:', err.message); process.exit(1) })

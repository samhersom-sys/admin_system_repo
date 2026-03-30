'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_date_basis (
                id            SERIAL PRIMARY KEY,
                field_id      TEXT NOT NULL UNIQUE,
                label         TEXT NOT NULL,
                description   TEXT,
                domain        TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_date_basis_domain ON lookup_date_basis (domain)`)
        console.log('[040] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[040] ERROR:', err.message); process.exit(1) })

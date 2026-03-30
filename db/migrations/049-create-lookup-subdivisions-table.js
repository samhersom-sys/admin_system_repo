'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_subdivisions (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                code         VARCHAR(10) NOT NULL,
                name         VARCHAR(100) NOT NULL,
                region       VARCHAR(100),
                sort_order   INTEGER NOT NULL DEFAULT 0,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_subdivisions_country_code ON lookup_subdivisions (country_code)`)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lookup_subdivisions_country_code ON lookup_subdivisions (country_code, code)`)
        console.log('[049] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[049] ERROR:', err.message); process.exit(1) })

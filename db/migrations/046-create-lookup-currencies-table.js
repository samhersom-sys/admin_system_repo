'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_currencies (
                code       VARCHAR(8) PRIMARY KEY,
                name       TEXT,
                is_active  BOOLEAN NOT NULL DEFAULT TRUE
            )
        `)
        console.log('[046] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[046] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_error_catalog (
                error_code       VARCHAR(50) PRIMARY KEY,
                category         VARCHAR(50),
                severity         VARCHAR(20) NOT NULL DEFAULT 'error',
                message_template TEXT NOT NULL,
                resolution_hint  TEXT,
                first_identified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_occurred    TIMESTAMPTZ,
                occurrence_count INTEGER NOT NULL DEFAULT 0
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_system_error_catalog_severity ON system_error_catalog (severity)`)
        console.log('[026] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[026] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[085] Creating error_log table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS error_log (
                id          SERIAL PRIMARY KEY,
                org_code    TEXT,
                user_name   TEXT,
                source      TEXT NOT NULL,
                error_code  TEXT NOT NULL,
                description TEXT NOT NULL,
                context     JSONB NOT NULL DEFAULT '{}',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS error_log_org_code_idx  ON error_log (org_code)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC)
        `)
        console.log('[085] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[085] ERROR:', err.message); process.exit(1) })

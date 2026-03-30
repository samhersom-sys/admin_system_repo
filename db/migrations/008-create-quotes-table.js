'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        console.log('[008] Creating quotes table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS quotes (
                id                  SERIAL PRIMARY KEY,
                reference           TEXT,
                submission_id       INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                insured             TEXT,
                insured_id          TEXT,
                status              TEXT,
                business_type       TEXT,
                inception_date      TEXT,
                expiry_date         TEXT,
                inception_time      TIME(3),
                expiry_time         TIME(3),
                created_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by          TEXT,
                created_by_org_code TEXT,
                payload             JSONB NOT NULL DEFAULT '{}'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_submission_id ON quotes (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status)`)
        console.log('[008] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[008] ERROR:', err.message); process.exit(1) })

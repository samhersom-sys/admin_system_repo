'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        console.log('[010] Creating claims table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id           SERIAL PRIMARY KEY,
                policy_id    INTEGER NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
                claim_number TEXT NOT NULL,
                reference    TEXT,
                status       TEXT NOT NULL DEFAULT 'Open',
                loss_date    DATE,
                reported_date DATE,
                description  TEXT,
                payload      JSONB NOT NULL DEFAULT '{}',
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status)`)
        console.log('[010] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[010] ERROR:', err.message); process.exit(1) })

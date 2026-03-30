'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        console.log('[011] Creating policy_transactions table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_transactions (
                id               SERIAL PRIMARY KEY,
                policy_id        INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
                transaction_type VARCHAR(50) NOT NULL,
                status           VARCHAR(50),
                effective_date   DATE,
                description      TEXT,
                payload          JSONB NOT NULL DEFAULT '{}',
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by       VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_transactions_policy_id ON policy_transactions (policy_id)`)
        console.log('[011] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[011] ERROR:', err.message); process.exit(1) })

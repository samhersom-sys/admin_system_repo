'use strict'
/**
 * Schema 08: policy_transactions table
 * Replaces migrations: 011-create-policy-transactions-table, 077-alter-policy_transactions-add-deleted-at
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[08-policy-transactions] Creating policy_transactions table...')

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
                created_by       VARCHAR(255),
                deleted_at       TIMESTAMP WITH TIME ZONE
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_transactions_policy_id  ON policy_transactions (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_transactions_deleted_at ON policy_transactions (deleted_at) WHERE deleted_at IS NULL`)

        await client.query(`ALTER TABLE policy_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)

        console.log('[08-policy-transactions] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[08-policy-transactions] ERROR:', err.message); process.exit(1) })

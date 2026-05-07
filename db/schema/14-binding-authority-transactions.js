'use strict'
/**
 * Schema 14: binding_authority_transactions table
 * Replaces migrations: 017-create-binding-authority-transactions-table,
 *                      083-alter-binding_authority_transactions-add-deleted-at
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[14-binding-authority-transactions] Creating binding_authority_transactions table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_transactions (
                id                    SERIAL PRIMARY KEY,
                binding_authority_id  INTEGER NOT NULL REFERENCES binding_authorities(id) ON DELETE CASCADE,
                type                  VARCHAR(50) NOT NULL,
                sub_type              VARCHAR(100),
                status                VARCHAR(50) NOT NULL,
                sequence_number       INTEGER,
                effective_date        DATE,
                description           TEXT,
                payload               JSONB NOT NULL DEFAULT '{}',
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by            VARCHAR(255),
                created_by_org_code   VARCHAR(50),
                deleted_at            TIMESTAMP WITH TIME ZONE
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_transactions_ba_id                          ON binding_authority_transactions (binding_authority_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authority_transactions_deleted_at       ON binding_authority_transactions (deleted_at) WHERE deleted_at IS NULL`)

        await client.query(`ALTER TABLE binding_authority_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)

        console.log('[14-binding-authority-transactions] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[14-binding-authority-transactions] ERROR:', err.message); process.exit(1) })

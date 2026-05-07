'use strict'
/**
 * Schema 07: claims table
 * Replaces migrations: 010-create-claims-table, 076-alter-claims-add-deleted-at
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[07-claims] Creating claims table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id            SERIAL PRIMARY KEY,
                policy_id     INTEGER NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
                claim_number  TEXT NOT NULL,
                reference     TEXT,
                status        TEXT NOT NULL DEFAULT 'Open',
                loss_date     DATE,
                reported_date DATE,
                description   TEXT,
                payload       JSONB NOT NULL DEFAULT '{}',
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at    TIMESTAMP WITH TIME ZONE
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_policy_id  ON claims (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_status     ON claims (status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_deleted_at ON claims (deleted_at) WHERE deleted_at IS NULL`)

        await client.query(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)

        console.log('[07-claims] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[07-claims] ERROR:', err.message); process.exit(1) })

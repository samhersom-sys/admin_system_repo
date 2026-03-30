'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_transactions (
                id                    SERIAL PRIMARY KEY,
                binding_authority_id  INTEGER NOT NULL REFERENCES binding_authorities(id) ON DELETE CASCADE,
                type                  VARCHAR(50) NOT NULL,
                status                VARCHAR(50) NOT NULL,
                effective_date        DATE,
                description           TEXT,
                payload               JSONB NOT NULL DEFAULT '{}',
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by            VARCHAR(255),
                created_by_org_code   VARCHAR(50)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_transactions_ba_id ON binding_authority_transactions (binding_authority_id)`)
        console.log('[017] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[017] ERROR:', err.message); process.exit(1) })

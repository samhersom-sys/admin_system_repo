'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        // 074: Add soft-delete column to quotes (§15.8 compliance)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes (deleted_at) WHERE deleted_at IS NULL`)
        console.log('[074] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[074] ERROR:', err.message); process.exit(1) })

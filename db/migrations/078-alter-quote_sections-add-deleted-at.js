'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        // 078: Add soft-delete column to quote_sections (§15.8 compliance)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_deleted_at ON quote_sections (deleted_at) WHERE deleted_at IS NULL`)
        console.log('[078] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[078] ERROR:', err.message); process.exit(1) })

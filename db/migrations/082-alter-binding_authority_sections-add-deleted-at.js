'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        // 082: Add soft-delete column to binding_authority_sections (§15.8 compliance)
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authority_sections_deleted_at ON binding_authority_sections (deleted_at) WHERE deleted_at IS NULL`)
        console.log('[082] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[082] ERROR:', err.message); process.exit(1) })

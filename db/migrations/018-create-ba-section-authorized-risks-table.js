'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_section_authorized_risks (
                id         SERIAL PRIMARY KEY,
                section_id INTEGER NOT NULL REFERENCES binding_authority_sections(id) ON DELETE CASCADE,
                risk_code  TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bas_auth_risks_section_id ON binding_authority_section_authorized_risks (section_id)`)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_bas_auth_risk ON binding_authority_section_authorized_risks (section_id, risk_code)`)
        console.log('[018] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[018] ERROR:', err.message); process.exit(1) })

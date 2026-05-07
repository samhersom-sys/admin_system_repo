'use strict'
/**
 * Schema 15: binding_authority_section_authorized_risks table
 * Replaces migrations: 018-create-ba-section-authorized-risks-table (no alters)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[15-ba-section-authorized-risks] Creating binding_authority_section_authorized_risks table...')

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

        console.log('[15-ba-section-authorized-risks] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[15-ba-section-authorized-risks] ERROR:', err.message); process.exit(1) })

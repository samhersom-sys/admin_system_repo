'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_schedules (
                id                           SERIAL PRIMARY KEY,
                name                         VARCHAR(255) NOT NULL,
                description                  TEXT,
                binding_authority_section_id INTEGER REFERENCES binding_authority_sections(id) ON DELETE SET NULL,
                effective_date               DATE,
                expiry_date                  DATE,
                currency                     VARCHAR(3) NOT NULL DEFAULT 'GBP',
                is_active                    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                   VARCHAR(255),
                updated_at                   TIMESTAMPTZ,
                updated_by                   VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_schedules_ba_section_id ON rating_schedules (binding_authority_section_id)`)
        console.log('[054] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[054] ERROR:', err.message); process.exit(1) })

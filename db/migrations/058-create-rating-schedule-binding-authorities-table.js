'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_schedule_binding_authorities (
                id                           SERIAL PRIMARY KEY,
                rating_schedule_id           INTEGER NOT NULL REFERENCES rating_schedules(id) ON DELETE CASCADE,
                binding_authority_id         INTEGER REFERENCES binding_authorities(id) ON DELETE CASCADE,
                binding_authority_section_id INTEGER REFERENCES binding_authority_sections(id) ON DELETE CASCADE,
                created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                   INTEGER
            )
        `)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_rsba_schedule_ba_section ON rating_schedule_binding_authorities (rating_schedule_id, binding_authority_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rsba_schedule_id ON rating_schedule_binding_authorities (rating_schedule_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rsba_ba_section_id ON rating_schedule_binding_authorities (binding_authority_section_id)`)
        console.log('[058] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[058] ERROR:', err.message); process.exit(1) })

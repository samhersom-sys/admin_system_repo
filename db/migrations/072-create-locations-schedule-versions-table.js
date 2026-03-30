'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations_schedule_versions (
                id              SERIAL PRIMARY KEY,
                import_id       INTEGER NOT NULL,
                version_number  INTEGER NOT NULL,
                payload         JSONB   NOT NULL,
                created_by      VARCHAR(255),
                created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active       BOOLEAN DEFAULT TRUE
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_schedule_versions_import ON locations_schedule_versions (import_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_schedule_versions_active ON locations_schedule_versions (import_id, is_active) WHERE is_active = TRUE`)
        console.log('[072] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[072] ERROR:', err.message); process.exit(1) })

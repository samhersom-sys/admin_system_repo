'use strict'
/**
 * Schema 26: binding authority extras
 * Replaces migration: 112-create-binding-authority-bordereau-configs-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[26-ba-extras] Creating binding_authority_bordereau_configs table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_bordereau_configs (
                id                   SERIAL PRIMARY KEY,
                binding_authority_id INTEGER NOT NULL REFERENCES binding_authorities(id) ON DELETE CASCADE,
                config_id            TEXT NOT NULL,
                name                 TEXT NOT NULL,
                type                 TEXT NOT NULL DEFAULT 'Risk',
                data_style           TEXT NOT NULL DEFAULT 'Transactional',
                fields               JSONB NOT NULL DEFAULT '[]',
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by_org_code  TEXT
            )
        `)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ba_bordereau_configs_config_id ON binding_authority_bordereau_configs (config_id)`)
        await client.query(`CREATE INDEX        IF NOT EXISTS idx_ba_bordereau_configs_ba_id    ON binding_authority_bordereau_configs (binding_authority_id)`)

        console.log('[26-ba-extras] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[26-ba-extras] ERROR:', err.message); process.exit(1) })

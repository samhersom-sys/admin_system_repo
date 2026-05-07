'use strict'
/**
 * Schema 13: binding_authority_sections table
 * Replaces migrations: 016-create-binding-authority-sections-table,
 *                      082-alter-binding_authority_sections-add-deleted-at,
 *                      113-alter-binding-authority-sections-add-cob-code
 * Note: financial view columns from migration 123 are in 29-financial-view-columns.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[13-binding-authority-sections] Creating binding_authority_sections table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_sections (
                id                      SERIAL PRIMARY KEY,
                binding_authority_id    INTEGER NOT NULL REFERENCES binding_authorities(id) ON DELETE CASCADE,
                reference               TEXT,
                class_of_business       TEXT,
                inception_date          DATE,
                effective_date          DATE,
                expiry_date             DATE,
                effective_time          TIME(3) DEFAULT '00:00:00.000',
                expiry_time             TIME(3) DEFAULT '00:00:00.000',
                days_on_cover           INTEGER,
                limit_currency          TEXT,
                limit_amount            NUMERIC(18,2),
                excess_currency         TEXT,
                excess_amount           NUMERIC(18,2),
                sum_insured_currency    TEXT,
                sum_insured             NUMERIC(18,2),
                time_basis              TEXT,
                payload                 JSONB NOT NULL DEFAULT '{}',
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                line_size               NUMERIC(18,2),
                written_premium_limit   NUMERIC(18,2),
                currency                TEXT DEFAULT 'GBP',
                deleted_at              TIMESTAMP WITH TIME ZONE,
                class_of_business_code  TEXT
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_sections_ba_id                    ON binding_authority_sections (binding_authority_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authority_sections_deleted_at ON binding_authority_sections (deleted_at) WHERE deleted_at IS NULL`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS deleted_at             TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS class_of_business_code TEXT`)

        console.log('[13-binding-authority-sections] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[13-binding-authority-sections] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
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
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_sections_ba_id ON binding_authority_sections (binding_authority_id)`)
        console.log('[016] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[016] ERROR:', err.message); process.exit(1) })

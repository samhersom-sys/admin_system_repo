'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        console.log('[096] Creating quote_section_risk_codes table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS quote_section_risk_codes (
                id SERIAL PRIMARY KEY,
                quote_section_id INTEGER NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
                code TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_quote_section_risk_codes_pair UNIQUE (quote_section_id, code)
            )
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quote_section_risk_codes_section_id
            ON quote_section_risk_codes (quote_section_id)
        `)

        console.log('[096] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[096] ERROR:', err.message)
    process.exit(1)
})

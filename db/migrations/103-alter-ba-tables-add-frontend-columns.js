'use strict'
/**
 * Migration 103 — Add missing columns used by the BA frontend
 *
 * Adds columns that the binding-authorities.service.ts types expect:
 *   - binding_authorities: coverholder_id, updated_at
 *   - binding_authority_sections: line_size, written_premium_limit, currency
 *   - binding_authority_transactions: amount, currency, date
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        // binding_authorities — coverholder_id + updated_at
        await client.query(`ALTER TABLE binding_authorities ADD COLUMN IF NOT EXISTS coverholder_id INTEGER`)
        await client.query(`ALTER TABLE binding_authorities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)

        // binding_authority_sections — line_size, written_premium_limit, currency
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS line_size NUMERIC(18,2)`)
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS written_premium_limit NUMERIC(18,2)`)
        await client.query(`ALTER TABLE binding_authority_sections ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP'`)

        // binding_authority_transactions — amount, currency, date
        await client.query(`ALTER TABLE binding_authority_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(18,2)`)
        await client.query(`ALTER TABLE binding_authority_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP'`)
        await client.query(`ALTER TABLE binding_authority_transactions ADD COLUMN IF NOT EXISTS date DATE`)

        console.log('[103] Done — Added missing BA frontend columns.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[103] ERROR:', err.message)
    process.exit(1)
})

'use strict'
/**
 * Migration 110 — add new_or_renewal column to policies table.
 *
 * Inherited from the quote when a policy is issued.
 * Nullable because existing policies pre-date this field.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS new_or_renewal TEXT`)
        console.log('[110] Done — policies.new_or_renewal added.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[110] ERROR:', err.message)
    process.exit(1)
})

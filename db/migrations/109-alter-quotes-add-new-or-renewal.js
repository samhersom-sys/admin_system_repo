'use strict'
/**
 * Migration 109 — add new_or_renewal column to quotes table.
 *
 * Adds a New/Renewal indicator so users can classify whether a quote is
 * new business or a renewal. Defaults to 'New'.
 * This field is inherited into the policies table when a policy is issued.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS new_or_renewal TEXT NOT NULL DEFAULT 'New'`)
        console.log('[109] Done — quotes.new_or_renewal added.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[109] ERROR:', err.message)
    process.exit(1)
})

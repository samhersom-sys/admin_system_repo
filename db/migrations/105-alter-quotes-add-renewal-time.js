'use strict'

/**
 * Migration 105 — Add renewal_time to quotes table
 *
 * Gap-fill: BackUp had renewalTime time(3) on the quote table.
 * Cleaned has renewal_date and renewal_status (from migration 093) but
 * was missing the corresponding time component.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE quotes
                ADD COLUMN IF NOT EXISTS renewal_time TIME
        `)
        console.log('105: Added renewal_time to quotes')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

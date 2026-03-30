'use strict'

/**
 * Migration 092 — Add last_opened_date to quotes table
 *
 * Required by: GET /api/recent-records-data
 * Schema-validation test: quotes.last_opened_date
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE quotes
                ADD COLUMN IF NOT EXISTS last_opened_date TIMESTAMP
        `)
        console.log('092: Added last_opened_date to quotes')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

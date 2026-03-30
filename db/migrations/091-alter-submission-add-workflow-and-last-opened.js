'use strict'

/**
 * Migration 091 — Add missing columns to submission table
 *
 * Required by:
 *   GET /api/my-work-items   → workflow_status, workflow_assigned_to  (OQ-011)
 *   GET /api/recent-records-data → last_opened_date
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS workflow_status      VARCHAR(50),
                ADD COLUMN IF NOT EXISTS workflow_assigned_to INTEGER,
                ADD COLUMN IF NOT EXISTS last_opened_date     TIMESTAMP
        `)
        console.log('091: Added workflow_status, workflow_assigned_to, last_opened_date to submission')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

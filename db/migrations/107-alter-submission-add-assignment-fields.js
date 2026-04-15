'use strict'

/**
 * Migration 107 — Add work-assignment columns to submission table
 *
 * Gap-fill (schema-only, no business logic): BackUp submission table had fields
 * supporting work assignment to specific users:
 *   assigned_by    — user id of who made the assignment (INTEGER FK to users)
 *   assigned_date  — when the assignment was made
 *
 * Note: workflow_assigned_to was already added in migration 091.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS assigned_by   INTEGER,
                ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMP WITH TIME ZONE
        `)
        console.log('107: Added assigned_by, assigned_date to submission')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

'use strict'

/**
 * Migration 086: Create password_audit_log table
 *
 * Audit trail for every password change. Written by the
 * POST /api/auth/reset-password endpoint.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_audit_log (
                id                  SERIAL PRIMARY KEY,
                user_id             INTEGER NOT NULL REFERENCES users(id),
                method              VARCHAR(50) NOT NULL,
                changed_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                changed_by_user_id  INTEGER
            )
        `)
        console.log('086: Created password_audit_log table')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

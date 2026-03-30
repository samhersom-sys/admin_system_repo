'use strict'

/**
 * Migration 087: Add ON DELETE CASCADE to auth FK constraints
 *
 * password_reset_tokens.user_id and password_audit_log.user_id need
 * ON DELETE CASCADE so test teardown (DELETE FROM users) works cleanly.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE password_reset_tokens
            DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey,
            ADD CONSTRAINT password_reset_tokens_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `)
        await pool.query(`
            ALTER TABLE password_audit_log
            DROP CONSTRAINT IF EXISTS password_audit_log_user_id_fkey,
            ADD CONSTRAINT password_audit_log_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `)
        console.log('087: Added ON DELETE CASCADE to password_reset_tokens and password_audit_log FK constraints')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

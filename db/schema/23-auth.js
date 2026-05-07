'use strict'
/**
 * Schema 23: auth / security tables
 * Replaces migrations: 085-create-password-reset-tokens-table,
 *                      085-create-error-log-table,
 *                      086-create-password-audit-log-table,
 *                      087-add-cascade-to-password-tables
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[23-auth] Creating auth/security tables...')

        // password_reset_tokens (085 + 087 CASCADE)
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id                  SERIAL PRIMARY KEY,
                user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token               VARCHAR(255) NOT NULL UNIQUE,
                used                BOOLEAN NOT NULL DEFAULT FALSE,
                expires_at          TIMESTAMP NOT NULL,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by_user_id  INTEGER
            )
        `)

        // password_audit_log (086 + 087 CASCADE)
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_audit_log (
                id                  SERIAL PRIMARY KEY,
                user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                method              VARCHAR(50) NOT NULL,
                changed_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                changed_by_user_id  INTEGER
            )
        `)

        // error_log (085b)
        await client.query(`
            CREATE TABLE IF NOT EXISTS error_log (
                id          SERIAL PRIMARY KEY,
                org_code    TEXT,
                user_name   TEXT,
                source      TEXT NOT NULL,
                error_code  TEXT NOT NULL,
                description TEXT NOT NULL,
                context     JSONB NOT NULL DEFAULT '{}',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS error_log_org_code_idx   ON error_log (org_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC)`)

        console.log('[23-auth] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[23-auth] ERROR:', err.message); process.exit(1) })

'use strict'
/**
 * Schema 01: users table
 * Replaces migrations: 001-create-users-table, 084-add-token-version-to-users
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[01-core-users] Creating users table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id                    SERIAL PRIMARY KEY,
                username              VARCHAR(100) NOT NULL UNIQUE,
                email                 VARCHAR(255) NOT NULL UNIQUE,
                password_hash         VARCHAR(255) NOT NULL,
                full_name             VARCHAR(255),
                org_code              VARCHAR(50),
                role                  VARCHAR(50) NOT NULL DEFAULT 'user',
                is_active             BOOLEAN NOT NULL DEFAULT true,
                failed_login_attempts INTEGER NOT NULL DEFAULT 0,
                locked_until          TIMESTAMP,
                last_login            TIMESTAMP,
                token_version         INTEGER NOT NULL DEFAULT 1,
                created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS users_email_index    ON users (email)`)
        await client.query(`CREATE INDEX IF NOT EXISTS users_username_index ON users (username)`)
        await client.query(`CREATE INDEX IF NOT EXISTS users_org_code_index ON users (org_code)`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1`)

        console.log('[01-core-users] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[01-core-users] ERROR:', err.message); process.exit(1) })

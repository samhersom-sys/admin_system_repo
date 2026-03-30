/**
 * Migration 001: Create users table
 *
 * Creates the `users` table required by the auth routes (/api/auth).
 * Run once against the target database:
 *   node db/migrations/001-create-users-table.js
 *
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 *
 * NOTE: This migration is schema-only. Demo and admin users are seeded
 * separately — run: npm run db:seed
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[001-create-users-table] Creating users table...')

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
                created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS users_email_index    ON users (email)`)
        await client.query(`CREATE INDEX IF NOT EXISTS users_username_index ON users (username)`)
        await client.query(`CREATE INDEX IF NOT EXISTS users_org_code_index ON users (org_code)`)

        console.log('[001-create-users-table] Table ready.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[001-create-users-table] ERROR:', err.message)
    process.exit(1)
})

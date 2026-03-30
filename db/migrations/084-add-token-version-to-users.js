'use strict'

/**
 * Migration 084: Add token_version to users
 *
 * Enables server-side token invalidation. On each login or logout,
 * token_version is incremented. JWT payloads carry tokenVersion; the
 * JWT strategy rejects tokens whose version no longer matches the DB.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1
        `)
        console.log('084: Added token_version column to users table')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

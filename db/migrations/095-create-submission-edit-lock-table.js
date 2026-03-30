'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        console.log('[095] Creating submission_edit_lock table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS submission_edit_lock (
                submission_id INTEGER PRIMARY KEY REFERENCES submission(id) ON DELETE CASCADE,
                org_code TEXT NOT NULL,
                locked_by_user_id INTEGER NOT NULL,
                locked_by_user_name TEXT NOT NULL,
                locked_by_user_email TEXT,
                acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_edit_lock_expires_at
            ON submission_edit_lock (expires_at)
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_edit_lock_user_id
            ON submission_edit_lock (locked_by_user_id)
        `)

        console.log('[095] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[095] ERROR:', err.message)
    process.exit(1)
})
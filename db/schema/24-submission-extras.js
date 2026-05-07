'use strict'
/**
 * Schema 24: submission extras
 * Replaces migrations: 094-create-submission-related-table,
 *                      095-create-submission-edit-lock-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[24-submission-extras] Creating submission extra tables...')

        // submission_related (094)
        await client.query(`
            CREATE TABLE IF NOT EXISTS submission_related (
                id                    SERIAL PRIMARY KEY,
                submission_id         INTEGER NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
                related_submission_id INTEGER NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by            TEXT,
                CONSTRAINT chk_submission_related_not_self CHECK (submission_id <> related_submission_id)
            )
        `)
        // Unique index using LEAST/GREATEST so (A,B) and (B,A) are treated as the same pair
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_related_pair_unique
            ON submission_related (LEAST(submission_id, related_submission_id), GREATEST(submission_id, related_submission_id))
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_related_submission_id         ON submission_related (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_related_related_submission_id ON submission_related (related_submission_id)`)

        // submission_edit_lock (095)
        await client.query(`
            CREATE TABLE IF NOT EXISTS submission_edit_lock (
                submission_id         INTEGER PRIMARY KEY REFERENCES submission(id) ON DELETE CASCADE,
                org_code              TEXT NOT NULL,
                locked_by_user_id     INTEGER NOT NULL,
                locked_by_user_name   TEXT NOT NULL,
                locked_by_user_email  TEXT,
                acquired_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at            TIMESTAMPTZ NOT NULL,
                updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_edit_lock_expires_at ON submission_edit_lock (expires_at)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_edit_lock_user_id   ON submission_edit_lock (locked_by_user_id)`)

        console.log('[24-submission-extras] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[24-submission-extras] ERROR:', err.message); process.exit(1) })

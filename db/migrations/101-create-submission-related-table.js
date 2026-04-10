'use strict'
/**
 * Migration 101 — add indexes to submission_related table.
 *
 * The submission_related table already exists (created via the BackUp project).
 * This migration adds the indexes required for query performance.
 *
 * Table schema (pre-existing):
 *   id                    SERIAL PRIMARY KEY
 *   submission_id         INTEGER REFERENCES submission(id) ON DELETE CASCADE
 *   related_submission_id INTEGER REFERENCES submission(id) ON DELETE CASCADE
 *   created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   created_by            TEXT
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_related_submission_id
                ON submission_related (submission_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_related_related_submission_id
                ON submission_related (related_submission_id)
        `)
        console.log('[101] submission_related indexes added.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[101] ERROR:', err.message); process.exit(1) })

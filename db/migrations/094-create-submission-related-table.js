'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        console.log('[094] Creating submission_related table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS submission_related (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
                related_submission_id INTEGER NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by TEXT,
                CONSTRAINT chk_submission_related_not_self CHECK (submission_id <> related_submission_id)
            )
        `)

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_related_pair_unique
            ON submission_related (LEAST(submission_id, related_submission_id), GREATEST(submission_id, related_submission_id))
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_related_submission_id
            ON submission_related (submission_id)
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_related_related_submission_id
            ON submission_related (related_submission_id)
        `)

        console.log('[094] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[094] ERROR:', err.message)
    process.exit(1)
})
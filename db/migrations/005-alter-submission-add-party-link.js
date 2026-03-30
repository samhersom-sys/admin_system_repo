/**
 * Migration 005: Alter submission table — add party_created_id foreign key
 *
 * The submissions route (backend/routes/submissions.js) LEFT JOINs party on
 * s."party_created_id" to derive the creating org's party type ("createdByOrgType").
 * This FK was referenced in the route but never added to the creating migration.
 *
 * Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
 * Run: node db/migrations/005-alter-submission-add-party-link.js
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[005-alter-submission-add-party-link] Altering submission table...')

        await client.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS "party_created_id" INTEGER
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_submission_party_created
                ON submission ("party_created_id")
        `)

        console.log('[005-alter-submission-add-party-link] Done. submission.party_created_id added.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[005-alter-submission-add-party-link] ERROR:', err.message)
    process.exit(1)
})

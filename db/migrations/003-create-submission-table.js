/**
 * Migration 003: Create submission table
 *
 * Creates the `submission` table used by the submissions route (/api/submissions).
 * Run once against the target database:
 *   node db/migrations/003-create-submission-table.js
 *
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[003-create-submission-table] Creating submission table...')

        await client.query(`
      CREATE TABLE IF NOT EXISTS submission (
        id                  SERIAL PRIMARY KEY,
        reference           TEXT,
        "submissionType"    TEXT,
        insured             TEXT,
        "insuredId"         TEXT,
        "placingBroker"     TEXT,
        "placingBrokerName" TEXT,
        "brokerId"          INTEGER,
        "contractType"      TEXT,
        "inceptionDate"     TEXT,
        "expiryDate"        TEXT,
        "renewalDate"       TEXT,
        status              TEXT,
        "createdDate"       TEXT,
        "createdBy"         TEXT,
        "createdByOrgCode"  TEXT,
        "invitedInsurers"   TEXT,
        "inviteResponses"   JSONB,
        audit               JSONB
      )
    `)

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submission_org_code
        ON submission ("createdByOrgCode")
    `)

        console.log('[003-create-submission-table] Done. submission table created (or already exists).')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[003-create-submission-table] ERROR:', err.message)
    process.exit(1)
})

'use strict'

/**
 * Migration 108 — Add clearance workflow columns to submission table
 *
 * Gap-fill (schema-only, no business logic): BackUp submission table had a
 * clearance pipeline for detecting duplicate/related submissions:
 *   clearance_status              — current clearance state (text)
 *   clearance_status_code         — lookup code for clearance_status
 *   clearance_notes               — free-text notes on clearance decision
 *   clearance_matched_submissions — JSONB array of matched submission ids/refs
 *   clearance_reviewed_by         — user id who reviewed clearance
 *   clearance_reviewed_date       — when clearance was reviewed
 *   auto_clearance_checked        — whether auto-clearance has run
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS clearance_status              TEXT,
                ADD COLUMN IF NOT EXISTS clearance_status_code         VARCHAR(50),
                ADD COLUMN IF NOT EXISTS clearance_notes               TEXT,
                ADD COLUMN IF NOT EXISTS clearance_matched_submissions  JSONB,
                ADD COLUMN IF NOT EXISTS clearance_reviewed_by         INTEGER,
                ADD COLUMN IF NOT EXISTS clearance_reviewed_date       TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS auto_clearance_checked        BOOLEAN NOT NULL DEFAULT FALSE
        `)
        console.log('108: Added clearance workflow columns to submission')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

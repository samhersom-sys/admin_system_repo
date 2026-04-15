'use strict'

/**
 * Migration 106 — Add workflow notes and AI pipeline columns to submission table
 *
 * Gap-fill (schema-only, no business logic): BackUp submission table had fields
 * supporting the email-ingestion AI pipeline:
 *   workflow_notes         — free-text notes on the workflow state
 *   ai_extracted           — whether data was extracted by AI from an email
 *   review_required        — flags the submission for human review
 *   email_source           — originating email address
 *   email_received_date    — when the source email was received
 *   email_processed_date   — when AI processing completed
 *   extraction_confidence  — confidence score (0.00–100.00) from AI extraction
 *
 * Note: workflow_status, workflow_assigned_to, and last_opened_date were already
 * added in migration 091.
 */

const { Pool } = require('pg')

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

async function run() {
    const pool = new Pool({ connectionString: DB_URL })
    try {
        await pool.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS workflow_notes        TEXT,
                ADD COLUMN IF NOT EXISTS ai_extracted         BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS review_required      BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS email_source         TEXT,
                ADD COLUMN IF NOT EXISTS email_received_date  TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS email_processed_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5,2)
        `)
        console.log('106: Added workflow_notes, ai_extracted, review_required, email_source, email_received_date, email_processed_date, extraction_confidence to submission')
    } finally {
        await pool.end()
    }
}

run().catch(err => { console.error(err.message); process.exit(1) })

'use strict'
/**
 * Schema 03: submission table
 * Replaces migrations: 003-create-submission-table, 005-alter-submission-add-party-link,
 *                      059-alter-submission-add-status-fk, 060-alter-submission-add-workflow-status-fk,
 *                      091-alter-submission-add-workflow-and-last-opened,
 *                      106-alter-submission-add-workflow-ai-fields,
 *                      107-alter-submission-add-assignment-fields,
 *                      108-alter-submission-add-clearance-fields
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[03-core-submissions] Creating submission table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS submission (
                id                              SERIAL PRIMARY KEY,
                reference                       TEXT,
                "submissionType"                TEXT,
                insured                         TEXT,
                "insuredId"                     TEXT,
                "placingBroker"                 TEXT,
                "placingBrokerName"             TEXT,
                "brokerId"                      INTEGER,
                "contractType"                  TEXT,
                "inceptionDate"                 TEXT,
                "expiryDate"                    TEXT,
                "renewalDate"                   TEXT,
                status                          TEXT,
                "createdDate"                   TEXT,
                "createdBy"                     TEXT,
                "createdByOrgCode"              TEXT,
                "invitedInsurers"               TEXT,
                "inviteResponses"               JSONB,
                audit                           JSONB,
                party_created_id                INTEGER,
                status_id                       INTEGER REFERENCES lookup_submission_statuses(id) ON DELETE SET NULL,
                workflow_status_code            VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL,
                clearance_status_code           VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL,
                workflow_status                 VARCHAR(50),
                workflow_assigned_to            INTEGER,
                last_opened_date                TIMESTAMP,
                workflow_notes                  TEXT,
                ai_extracted                    BOOLEAN NOT NULL DEFAULT FALSE,
                review_required                 BOOLEAN NOT NULL DEFAULT FALSE,
                email_source                    TEXT,
                email_received_date             TIMESTAMP WITH TIME ZONE,
                email_processed_date            TIMESTAMP WITH TIME ZONE,
                extraction_confidence           NUMERIC(5,2),
                assigned_by                     INTEGER,
                assigned_date                   TIMESTAMP WITH TIME ZONE,
                clearance_status                TEXT,
                clearance_notes                 TEXT,
                clearance_matched_submissions   JSONB,
                clearance_reviewed_by           INTEGER,
                clearance_reviewed_date         TIMESTAMP WITH TIME ZONE,
                auto_clearance_checked          BOOLEAN NOT NULL DEFAULT FALSE
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_org_code           ON submission ("createdByOrgCode")`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_party_created      ON submission (party_created_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_status_id          ON submission (status_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_workflow_status_code ON submission (workflow_status_code)`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS party_created_id              INTEGER`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS status_id                     INTEGER REFERENCES lookup_submission_statuses(id) ON DELETE SET NULL`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS workflow_status_code          VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_status_code         VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS workflow_status               VARCHAR(50)`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS workflow_assigned_to          INTEGER`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS last_opened_date              TIMESTAMP`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS workflow_notes                TEXT`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS ai_extracted                  BOOLEAN NOT NULL DEFAULT FALSE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS review_required               BOOLEAN NOT NULL DEFAULT FALSE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS email_source                  TEXT`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS email_received_date           TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS email_processed_date          TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS extraction_confidence         NUMERIC(5,2)`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS assigned_by                   INTEGER`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS assigned_date                 TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_status              TEXT`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_notes               TEXT`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_matched_submissions  JSONB`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_reviewed_by         INTEGER`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS clearance_reviewed_date       TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS auto_clearance_checked        BOOLEAN NOT NULL DEFAULT FALSE`)

        console.log('[03-core-submissions] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[03-core-submissions] ERROR:', err.message); process.exit(1) })

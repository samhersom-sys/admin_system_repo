/**
 * Migration 006: Create audit_event table
 *
 * Creates the `public.audit_event` table and its covering indexes.
 * This supersedes the ad-hoc `backend/create-audit-event-table.js` script;
 * the backend script is retained for historical reference only.
 *
 * Table purpose: append-only log of every significant user action in the
 * system.  Used by the audit trail tabs on submission, party, and policy
 * view pages, and by the search route to derive `lastOpenedDate`.
 *
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 * Run: node db/migrations/006-create-audit-event-table.js
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
        console.log('[006-create-audit-event-table] Creating audit_event table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.audit_event (
                id          BIGSERIAL    PRIMARY KEY,
                entity_type TEXT         NOT NULL,
                entity_id   INTEGER      NOT NULL,
                action      TEXT         NOT NULL,
                details     JSONB        NOT NULL DEFAULT '{}',
                created_by  TEXT         NOT NULL DEFAULT '',
                user_id     INTEGER,
                user_name   TEXT         NOT NULL DEFAULT '',
                created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
        `)
        console.log('[006-create-audit-event-table] Table audit_event OK.')

        // Composite index for fetching the audit trail of a specific entity
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_event_entity
                ON public.audit_event (entity_type, entity_id, created_at DESC)
        `)

        // Index for user-scoped activity queries and de-duplication check
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_event_user_action
                ON public.audit_event (user_id, action, created_at DESC)
        `)

        console.log('[006-create-audit-event-table] Indexes OK.')
        console.log('[006-create-audit-event-table] Migration complete.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((err) => {
    console.error('[006-create-audit-event-table] ERROR:', err.message)
    process.exit(1)
})

'use strict'
/**
 * Schema 04: audit_event table
 * Replaces migrations: 006-create-audit-event-table (no alters)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[04-core-audit] Creating audit_event table...')

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

        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_event_entity     ON public.audit_event (entity_type, entity_id, created_at DESC)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_event_user_action ON public.audit_event (user_id, action, created_at DESC)`)

        console.log('[04-core-audit] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[04-core-audit] ERROR:', err.message); process.exit(1) })

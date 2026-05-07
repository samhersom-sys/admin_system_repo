'use strict'
/**
 * Schema 06: policies table
 * Replaces migrations: 009-create-policies-table, 075-alter-policies-add-deleted-at,
 *                      110-alter-policies-add-new-or-renewal, 114-alter-policies-add-renewable
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[06-policies] Creating policies table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS policies (
                id                      SERIAL PRIMARY KEY,
                reference               TEXT,
                quote_id                INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
                submission_id           INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                insured                 TEXT,
                insured_id              TEXT,
                party_id_insured        INTEGER REFERENCES party(id) ON DELETE SET NULL,
                party_id_placing_broker INTEGER REFERENCES party(id) ON DELETE SET NULL,
                placing_broker          TEXT,
                inception_date          TEXT,
                expiry_date             TEXT,
                inception_time          TIME(3),
                expiry_time             TIME(3),
                renewal_date            TEXT,
                renewal_time            TIME(3),
                gross_written_premium   NUMERIC(18,2),
                status                  TEXT,
                status_id               INTEGER,
                business_type           TEXT,
                contract_type           TEXT,
                created_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by              TEXT,
                created_by_org_code     TEXT,
                payload                 JSONB NOT NULL DEFAULT '{}',
                deleted_at              TIMESTAMP WITH TIME ZONE,
                new_or_renewal          TEXT,
                renewable               TEXT
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_quote_id      ON policies (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_submission_id ON policies (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_status        ON policies (status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_deleted_at    ON policies (deleted_at) WHERE deleted_at IS NULL`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_renewable     ON policies (renewable)`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS new_or_renewal  TEXT`)
        await client.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS renewable       TEXT`)

        console.log('[06-policies] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[06-policies] ERROR:', err.message); process.exit(1) })

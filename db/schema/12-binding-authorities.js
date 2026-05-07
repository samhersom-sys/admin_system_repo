'use strict'
/**
 * Schema 12: binding_authorities table
 * Replaces migrations: 015-create-binding-authorities-table, 081-alter-binding_authorities-add-deleted-at
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[12-binding-authorities] Creating binding_authorities table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authorities (
                id                  SERIAL PRIMARY KEY,
                reference           TEXT,
                submission_id       INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                status              TEXT,
                inception_date      DATE NOT NULL DEFAULT CURRENT_DATE,
                expiry_date         DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
                inception_time      TIME(3) DEFAULT '00:00:00.000',
                expiry_time         TIME(3) DEFAULT '23:59:59.000',
                year_of_account     INTEGER,
                is_multi_year       BOOLEAN NOT NULL DEFAULT FALSE,
                renewal_date        DATE,
                renewal_time        TIME(3) DEFAULT '00:00:00.000',
                renewal_status      TEXT,
                last_opened         TIMESTAMPTZ,
                locked              BOOLEAN NOT NULL DEFAULT FALSE,
                payload             JSONB NOT NULL DEFAULT '{}',
                audit               JSONB DEFAULT '[]',
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by          TEXT,
                created_by_org_code TEXT,
                coverholder_id      INTEGER,
                updated_at          TIMESTAMPTZ DEFAULT NOW(),
                deleted_at          TIMESTAMP WITH TIME ZONE
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authorities_submission_id ON binding_authorities (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authorities_status        ON binding_authorities (status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_binding_authorities_deleted_at    ON binding_authorities (deleted_at) WHERE deleted_at IS NULL`)

        await client.query(`ALTER TABLE binding_authorities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`)

        console.log('[12-binding-authorities] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[12-binding-authorities] ERROR:', err.message); process.exit(1) })

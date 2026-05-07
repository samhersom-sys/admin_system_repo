'use strict'
/**
 * Schema 05: quotes table
 * Replaces migrations: 008-create-quotes-table, 074-alter-quotes-add-deleted-at,
 *                      084-alter-quotes-add-currency, 092-alter-quotes-add-last-opened,
 *                      093-alter-quotes-add-block2-fields, 105-alter-quotes-add-renewal-time,
 *                      109-alter-quotes-add-new-or-renewal
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[05-quotes] Creating quotes table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS quotes (
                id                      SERIAL PRIMARY KEY,
                reference               TEXT,
                submission_id           INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                insured                 TEXT,
                insured_id              TEXT,
                status                  TEXT,
                business_type           TEXT,
                inception_date          TEXT,
                expiry_date             TEXT,
                inception_time          TIME(3),
                expiry_time             TIME(3),
                created_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by              TEXT,
                created_by_org_code     TEXT,
                payload                 JSONB NOT NULL DEFAULT '{}',
                deleted_at              TIMESTAMP WITH TIME ZONE,
                quote_currency          TEXT NOT NULL DEFAULT 'USD',
                last_opened_date        TIMESTAMP,
                year_of_account         TEXT,
                lta_applicable          BOOLEAN NOT NULL DEFAULT FALSE,
                lta_start_date          DATE,
                lta_start_time          TIME DEFAULT '00:00:00',
                lta_expiry_date         DATE,
                lta_expiry_time         TIME DEFAULT '23:59:59',
                contract_type           TEXT,
                method_of_placement     TEXT,
                unique_market_reference TEXT,
                renewable_indicator     TEXT NOT NULL DEFAULT 'No',
                renewal_date            DATE,
                renewal_status          TEXT,
                renewal_time            TIME,
                new_or_renewal          TEXT NOT NULL DEFAULT 'New'
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_submission_id ON quotes (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_status        ON quotes (status)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at    ON quotes (deleted_at) WHERE deleted_at IS NULL`)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at              TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_currency          TEXT NOT NULL DEFAULT 'USD'`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_opened_date        TIMESTAMP`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS year_of_account         TEXT`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lta_applicable         BOOLEAN NOT NULL DEFAULT FALSE`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lta_start_date         DATE`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lta_start_time         TIME DEFAULT '00:00:00'`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lta_expiry_date        DATE`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lta_expiry_time        TIME DEFAULT '23:59:59'`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_type          TEXT`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS method_of_placement    TEXT`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS unique_market_reference TEXT`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS renewable_indicator    TEXT NOT NULL DEFAULT 'No'`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS renewal_date           DATE`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS renewal_status         TEXT`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS renewal_time           TIME`)
        await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS new_or_renewal         TEXT NOT NULL DEFAULT 'New'`)

        console.log('[05-quotes] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[05-quotes] ERROR:', err.message); process.exit(1) })

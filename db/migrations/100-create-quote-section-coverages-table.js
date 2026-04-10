'use strict'
/**
 * Migration 100 — create quote_section_coverages table.
 *
 * REQ-QUO-BE-F-041 to F-044.
 *
 * Coverage rows are nested under a quote_section. Each row holds optional
 * financial fields (limits, excess, sum insured, premium) and a days_on_cover
 * field that is computed from effective_date / expiry_date on every PUT.
 *
 * Soft-delete pattern: deleted_at IS NULL = active.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS quote_section_coverages (
                id                    SERIAL PRIMARY KEY,
                quote_id              INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                section_id            INTEGER NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
                reference             TEXT,
                coverage              TEXT,
                class_of_business     TEXT,
                effective_date        DATE,
                expiry_date           DATE,
                days_on_cover         INTEGER,
                limit_currency        VARCHAR(8),
                limit_amount          NUMERIC(18, 2),
                limit_loss_qualifier  TEXT,
                excess_currency       VARCHAR(8),
                excess_amount         NUMERIC(18, 2),
                sum_insured_currency  VARCHAR(8),
                sum_insured           NUMERIC(18, 2),
                premium_currency      VARCHAR(8),
                gross_premium         NUMERIC(18, 2),
                net_premium           NUMERIC(18, 2),
                tax_receivable        NUMERIC(18, 2),
                payload               JSONB NOT NULL DEFAULT '{}',
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at            TIMESTAMPTZ
            )
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_section_id
            ON quote_section_coverages (section_id)
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_quote_id
            ON quote_section_coverages (quote_id)
        `)

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_deleted_at
            ON quote_section_coverages (deleted_at) WHERE deleted_at IS NULL
        `)

        console.log('[100] Done — quote_section_coverages table created.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[100] ERROR:', err.message)
    process.exit(1)
})

'use strict'
/**
 * Schema 11: policy_section_coverages table
 * Replaces migrations: 014-create-policy-coverages-table, 080-alter-policy_coverages-add-deleted-at,
 *                      099-rename-policy-coverages-table (uses final name from start),
 *                      100-create-quote-section-coverages-table
 *
 * Migration 099 renamed policy_coverages -> policy_section_coverages and added days_on_cover.
 * This schema uses the final name directly. A rename guard is included for safety.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[11-policy-section-coverages] Creating policy_section_coverages and quote_section_coverages tables...')

        // Rename legacy table if it still exists under the old name
        await client.query(`
            DO $$
            DECLARE
                has_legacy  BOOLEAN := to_regclass('public.policy_coverages') IS NOT NULL;
                has_new     BOOLEAN := to_regclass('public.policy_section_coverages') IS NOT NULL;
            BEGIN
                IF has_legacy AND NOT has_new THEN
                    ALTER TABLE policy_coverages RENAME TO policy_section_coverages;
                    ALTER INDEX IF EXISTS idx_policy_coverages_section_id RENAME TO idx_policy_section_coverages_section_id;
                    ALTER INDEX IF EXISTS idx_policy_coverages_policy_id  RENAME TO idx_policy_section_coverages_policy_id;
                    ALTER INDEX IF EXISTS idx_policy_coverages_deleted_at RENAME TO idx_policy_section_coverages_deleted_at;
                END IF;
            END $$;
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_section_coverages (
                id                   SERIAL PRIMARY KEY,
                policy_id            INTEGER REFERENCES policies(id) ON DELETE SET NULL,
                section_id           INTEGER NOT NULL REFERENCES policy_sections(id) ON DELETE CASCADE,
                reference            TEXT,
                coverage             TEXT,
                class_of_business    TEXT,
                inception_date       DATE,
                effective_date       DATE,
                expiry_date          DATE,
                limit_currency       TEXT,
                limit_amount         NUMERIC(18,2),
                excess_currency      TEXT,
                excess_amount        NUMERIC(18,2),
                sum_insured_currency TEXT,
                sum_insured          NUMERIC(18,2),
                premium_currency     TEXT,
                gross_premium        NUMERIC(18,2),
                net_premium          NUMERIC(18,2),
                tax_receivable       NUMERIC(18,2),
                payload              JSONB NOT NULL DEFAULT '{}',
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at           TIMESTAMP WITH TIME ZONE,
                days_on_cover        INTEGER
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_coverages_section_id ON policy_section_coverages (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_coverages_policy_id  ON policy_section_coverages (policy_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_coverages_deleted_at ON policy_section_coverages (deleted_at) WHERE deleted_at IS NULL`)

        await client.query(`ALTER TABLE policy_section_coverages ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE policy_section_coverages ADD COLUMN IF NOT EXISTS days_on_cover INTEGER`)

        // quote_section_coverages (migration 100)
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

        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_section_id ON quote_section_coverages (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_section_coverages_quote_id   ON quote_section_coverages (quote_id)`)

        console.log('[11-policy-section-coverages] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[11-policy-section-coverages] ERROR:', err.message); process.exit(1) })

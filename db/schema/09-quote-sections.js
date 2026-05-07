'use strict'
/**
 * Schema 09: quote_sections table
 * Replaces migrations: 012-create-quote-sections-table, 062-alter-quote-sections-add-ba-fks,
 *                      078-alter-quote_sections-add-deleted-at,
 *                      102-alter-quote-sections-add-order-time-fields,
 *                      103-alter-quote-sections-add-annual-premiums,
 *                      104-alter-quote-sections-add-da-ref-strings
 * Note: financial view columns from migration 123 are in 29-financial-view-columns.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[09-quote-sections] Creating quote_sections table...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS quote_sections (
                id                               SERIAL PRIMARY KEY,
                quote_id                         INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                reference                        TEXT,
                class_of_business                TEXT,
                inception_date                   DATE,
                effective_date                   DATE,
                expiry_date                      DATE,
                inception_time                   TIME(3) DEFAULT '00:00:00.000',
                effective_time                   TIME(3) DEFAULT '00:00:00.000',
                expiry_time                      TIME(3) DEFAULT '23:59:59.000',
                days_on_cover                    INTEGER,
                limit_currency                   VARCHAR(8),
                limit_amount                     NUMERIC(18,2),
                limit_loss_qualifier             TEXT,
                excess_currency                  VARCHAR(8),
                excess_amount                    NUMERIC(18,2),
                excess_loss_qualifier            TEXT,
                sum_insured_currency             VARCHAR(8),
                sum_insured                      NUMERIC(18,2),
                premium_currency                 VARCHAR(8),
                gross_gross_premium              NUMERIC(18,2),
                gross_premium                    NUMERIC(18,2),
                deductions                       NUMERIC(18,2),
                net_premium                      NUMERIC(18,2),
                tax_receivable                   NUMERIC(18,2),
                delegated_authority_id           INTEGER REFERENCES binding_authorities(id) ON DELETE SET NULL,
                delegated_authority_section_id   INTEGER REFERENCES binding_authority_sections(id) ON DELETE SET NULL,
                is_current                       BOOLEAN NOT NULL DEFAULT TRUE,
                created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                payload                          JSONB NOT NULL DEFAULT '{}',
                deleted_at                       TIMESTAMP WITH TIME ZONE,
                time_basis                       VARCHAR(100),
                written_order_basis              TEXT,
                signed_order_basis               TEXT,
                written_line_total               NUMERIC(18,2),
                signed_line_total                NUMERIC(18,2),
                annual_gross_premium             NUMERIC(18,2),
                annual_net_premium               NUMERIC(18,2),
                delegated_authority_ref          TEXT,
                delegated_authority_section_ref  TEXT
            )
        `)

        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_quote_id           ON quote_sections (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_ba_id              ON quote_sections (delegated_authority_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_ba_section_id      ON quote_sections (delegated_authority_section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_quote_sections_deleted_at         ON quote_sections (deleted_at) WHERE deleted_at IS NULL`)

        // Ensure FK constraints exist (in case table was created without them)
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name='quote_sections' AND constraint_name='fk_quote_sections_ba'
                ) THEN
                    ALTER TABLE quote_sections
                        ADD CONSTRAINT fk_quote_sections_ba
                        FOREIGN KEY (delegated_authority_id) REFERENCES binding_authorities(id) ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name='quote_sections' AND constraint_name='fk_quote_sections_ba_section'
                ) THEN
                    ALTER TABLE quote_sections
                        ADD CONSTRAINT fk_quote_sections_ba_section
                        FOREIGN KEY (delegated_authority_section_id) REFERENCES binding_authority_sections(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `)

        // Idempotent column additions for environments using partial schemas
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS deleted_at                      TIMESTAMP WITH TIME ZONE`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS time_basis                      VARCHAR(100)`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS written_order_basis             TEXT`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS signed_order_basis              TEXT`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS written_line_total              NUMERIC(18,2)`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS signed_line_total               NUMERIC(18,2)`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS annual_gross_premium            NUMERIC(18,2)`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS annual_net_premium              NUMERIC(18,2)`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS delegated_authority_ref         TEXT`)
        await client.query(`ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS delegated_authority_section_ref TEXT`)

        console.log('[09-quote-sections] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[09-quote-sections] ERROR:', err.message); process.exit(1) })

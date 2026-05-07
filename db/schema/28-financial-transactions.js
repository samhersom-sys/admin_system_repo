'use strict'
/**
 * Schema 28: financial transaction detail tables
 * Replaces migrations: 121-create-policy-section-transactions-table,
 *                      122-create-binding-authority-section-transactions-table
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[28-financial-transactions] Creating financial transaction tables...')

        // policy_section_transactions (121)
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_section_transactions (
                id                         SERIAL PRIMARY KEY,
                policy_transaction_id      INTEGER NOT NULL REFERENCES policy_transactions(id) ON DELETE CASCADE,
                section_id                 INTEGER NOT NULL REFERENCES policy_sections(id)     ON DELETE CASCADE,
                transaction_type           VARCHAR(50),
                effective_date             DATE,

                limit_amount_current       NUMERIC(18,2) NOT NULL DEFAULT 0,
                limit_amount_prev          NUMERIC(18,2) NOT NULL DEFAULT 0,
                limit_amount_mvmt          NUMERIC(18,2) NOT NULL DEFAULT 0,

                excess_amount_current      NUMERIC(18,2) NOT NULL DEFAULT 0,
                excess_amount_prev         NUMERIC(18,2) NOT NULL DEFAULT 0,
                excess_amount_mvmt         NUMERIC(18,2) NOT NULL DEFAULT 0,

                sum_insured_current        NUMERIC(18,2) NOT NULL DEFAULT 0,
                sum_insured_prev           NUMERIC(18,2) NOT NULL DEFAULT 0,
                sum_insured_mvmt           NUMERIC(18,2) NOT NULL DEFAULT 0,

                gross_premium_current      NUMERIC(18,2) NOT NULL DEFAULT 0,
                gross_premium_prev         NUMERIC(18,2) NOT NULL DEFAULT 0,
                gross_premium_mvmt         NUMERIC(18,2) NOT NULL DEFAULT 0,

                net_premium_current        NUMERIC(18,2) NOT NULL DEFAULT 0,
                net_premium_prev           NUMERIC(18,2) NOT NULL DEFAULT 0,
                net_premium_mvmt           NUMERIC(18,2) NOT NULL DEFAULT 0,

                tax_receivable_current     NUMERIC(18,2) NOT NULL DEFAULT 0,
                tax_receivable_prev        NUMERIC(18,2) NOT NULL DEFAULT 0,
                tax_receivable_mvmt        NUMERIC(18,2) NOT NULL DEFAULT 0,

                deductions_current         NUMERIC(18,2) NOT NULL DEFAULT 0,
                deductions_prev            NUMERIC(18,2) NOT NULL DEFAULT 0,
                deductions_mvmt            NUMERIC(18,2) NOT NULL DEFAULT 0,

                annual_gross_premium_current NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_gross_premium_prev    NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_gross_premium_mvmt    NUMERIC(18,2) NOT NULL DEFAULT 0,

                annual_net_premium_current   NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_net_premium_prev      NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_net_premium_mvmt      NUMERIC(18,2) NOT NULL DEFAULT 0,

                created_by                 VARCHAR(255),
                created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_transactions_transaction ON policy_section_transactions (policy_transaction_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_section_transactions_section     ON policy_section_transactions (section_id)`)

        // binding_authority_section_transactions (122)
        await client.query(`
            CREATE TABLE IF NOT EXISTS binding_authority_section_transactions (
                id                         SERIAL PRIMARY KEY,
                ba_transaction_id          INTEGER NOT NULL REFERENCES binding_authority_transactions(id) ON DELETE CASCADE,
                section_id                 INTEGER NOT NULL REFERENCES binding_authority_sections(id)     ON DELETE CASCADE,
                transaction_type           VARCHAR(50),
                effective_date             DATE,

                limit_amount_current       NUMERIC(18,2) NOT NULL DEFAULT 0,
                limit_amount_prev          NUMERIC(18,2) NOT NULL DEFAULT 0,
                limit_amount_mvmt          NUMERIC(18,2) NOT NULL DEFAULT 0,

                excess_amount_current      NUMERIC(18,2) NOT NULL DEFAULT 0,
                excess_amount_prev         NUMERIC(18,2) NOT NULL DEFAULT 0,
                excess_amount_mvmt         NUMERIC(18,2) NOT NULL DEFAULT 0,

                sum_insured_current        NUMERIC(18,2) NOT NULL DEFAULT 0,
                sum_insured_prev           NUMERIC(18,2) NOT NULL DEFAULT 0,
                sum_insured_mvmt           NUMERIC(18,2) NOT NULL DEFAULT 0,

                gross_premium_current      NUMERIC(18,2) NOT NULL DEFAULT 0,
                gross_premium_prev         NUMERIC(18,2) NOT NULL DEFAULT 0,
                gross_premium_mvmt         NUMERIC(18,2) NOT NULL DEFAULT 0,

                net_premium_current        NUMERIC(18,2) NOT NULL DEFAULT 0,
                net_premium_prev           NUMERIC(18,2) NOT NULL DEFAULT 0,
                net_premium_mvmt           NUMERIC(18,2) NOT NULL DEFAULT 0,

                tax_receivable_current     NUMERIC(18,2) NOT NULL DEFAULT 0,
                tax_receivable_prev        NUMERIC(18,2) NOT NULL DEFAULT 0,
                tax_receivable_mvmt        NUMERIC(18,2) NOT NULL DEFAULT 0,

                deductions_current         NUMERIC(18,2) NOT NULL DEFAULT 0,
                deductions_prev            NUMERIC(18,2) NOT NULL DEFAULT 0,
                deductions_mvmt            NUMERIC(18,2) NOT NULL DEFAULT 0,

                annual_gross_premium_current NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_gross_premium_prev    NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_gross_premium_mvmt    NUMERIC(18,2) NOT NULL DEFAULT 0,

                annual_net_premium_current   NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_net_premium_prev      NUMERIC(18,2) NOT NULL DEFAULT 0,
                annual_net_premium_mvmt      NUMERIC(18,2) NOT NULL DEFAULT 0,

                created_by                 VARCHAR(255),
                created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_transactions_ba_transaction ON binding_authority_section_transactions (ba_transaction_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ba_section_transactions_section        ON binding_authority_section_transactions (section_id)`)

        console.log('[28-financial-transactions] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[28-financial-transactions] ERROR:', err.message); process.exit(1) })

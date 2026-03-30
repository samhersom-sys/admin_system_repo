'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_sections (
                id                    SERIAL PRIMARY KEY,
                policy_id             INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
                reference             TEXT,
                class_of_business     TEXT,
                inception_date        DATE,
                effective_date        DATE,
                expiry_date           DATE,
                inception_time        TIME(3) DEFAULT '00:00:00.000',
                effective_time        TIME(3) DEFAULT '00:00:00.000',
                expiry_time           TIME(3) DEFAULT '23:59:59.000',
                days_on_cover         INTEGER,
                limit_currency        VARCHAR(8),
                limit_amount          NUMERIC(18,2),
                limit_loss_qualifier  TEXT,
                excess_currency       VARCHAR(8),
                excess_amount         NUMERIC(18,2),
                excess_loss_qualifier TEXT,
                sum_insured_currency  VARCHAR(8),
                sum_insured           NUMERIC(18,2),
                premium_currency      VARCHAR(8),
                gross_gross_premium   NUMERIC(18,2),
                gross_premium         NUMERIC(18,2),
                deductions            NUMERIC(18,2),
                net_premium           NUMERIC(18,2),
                tax_receivable        NUMERIC(18,2),
                is_current            BOOLEAN NOT NULL DEFAULT TRUE,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                payload               JSONB NOT NULL DEFAULT '{}'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_sections_policy_id ON policy_sections (policy_id)`)
        console.log('[013] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[013] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS policy_coverages (
                id                  SERIAL PRIMARY KEY,
                policy_id           INTEGER REFERENCES policies(id) ON DELETE SET NULL,
                section_id          INTEGER NOT NULL REFERENCES policy_sections(id) ON DELETE CASCADE,
                reference           TEXT,
                coverage            TEXT,
                class_of_business   TEXT,
                inception_date      DATE,
                effective_date      DATE,
                expiry_date         DATE,
                limit_currency      TEXT,
                limit_amount        NUMERIC(18,2),
                excess_currency     TEXT,
                excess_amount       NUMERIC(18,2),
                sum_insured_currency TEXT,
                sum_insured         NUMERIC(18,2),
                premium_currency    TEXT,
                gross_premium       NUMERIC(18,2),
                net_premium         NUMERIC(18,2),
                tax_receivable      NUMERIC(18,2),
                payload             JSONB NOT NULL DEFAULT '{}',
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_coverages_section_id ON policy_coverages (section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policy_coverages_policy_id ON policy_coverages (policy_id)`)
        console.log('[014] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[014] ERROR:', err.message); process.exit(1) })

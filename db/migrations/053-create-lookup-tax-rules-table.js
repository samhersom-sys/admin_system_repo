'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_tax_rules (
                id               SERIAL PRIMARY KEY,
                tax_id           VARCHAR(50) NOT NULL UNIQUE,
                name             VARCHAR(100) NOT NULL,
                country_code     VARCHAR(3) NOT NULL,
                state_code       VARCHAR(10),
                city             VARCHAR(100),
                line_of_business VARCHAR(50) NOT NULL DEFAULT 'ANY',
                tax_type         VARCHAR(50) NOT NULL,
                base             VARCHAR(20) NOT NULL,
                rate_percent     NUMERIC(10,4) NOT NULL,
                fixed_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
                min_amount       NUMERIC(15,2),
                max_amount       NUMERIC(15,2),
                effective_from   DATE NOT NULL,
                effective_to     DATE,
                notes            TEXT,
                is_active        BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_tax_rules_country_code ON lookup_tax_rules (country_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_tax_rules_country_state ON lookup_tax_rules (country_code, state_code)`)
        console.log('[053] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[053] ERROR:', err.message); process.exit(1) })

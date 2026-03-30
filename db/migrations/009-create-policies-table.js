'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        console.log('[009] Creating policies table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS policies (
                id                    SERIAL PRIMARY KEY,
                reference             TEXT,
                quote_id              INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
                submission_id         INTEGER REFERENCES submission(id) ON DELETE SET NULL,
                insured               TEXT,
                insured_id            TEXT,
                party_id_insured      INTEGER REFERENCES party(id) ON DELETE SET NULL,
                party_id_placing_broker INTEGER REFERENCES party(id) ON DELETE SET NULL,
                placing_broker        TEXT,
                inception_date        TEXT,
                expiry_date           TEXT,
                inception_time        TIME(3),
                expiry_time           TIME(3),
                renewal_date          TEXT,
                renewal_time          TIME(3),
                gross_written_premium NUMERIC(18,2),
                status                TEXT,
                status_id             INTEGER,
                business_type         TEXT,
                contract_type         TEXT,
                created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by            TEXT,
                created_by_org_code   TEXT,
                payload               JSONB NOT NULL DEFAULT '{}'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_quote_id ON policies (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_submission_id ON policies (submission_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_status ON policies (status)`)
        console.log('[009] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[009] ERROR:', err.message); process.exit(1) })

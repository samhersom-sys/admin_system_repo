'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id           SERIAL PRIMARY KEY,
                org_code     TEXT,
                name         TEXT NOT NULL,
                description  TEXT,
                type         TEXT NOT NULL DEFAULT 'custom',
                data_source  TEXT,
                date_basis   TEXT,
                date_from    TEXT,
                date_to      TEXT,
                sort_by      TEXT,
                sort_order   TEXT,
                fields       JSONB,
                filters      JSONB NOT NULL DEFAULT '[]',
                created_by   TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_templates_org_code ON report_templates (org_code)`)
        console.log('[024] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[024] ERROR:', err.message); process.exit(1) })

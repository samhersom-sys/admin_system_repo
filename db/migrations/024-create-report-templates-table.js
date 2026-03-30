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
                name         TEXT NOT NULL,
                description  TEXT,
                type         VARCHAR(20) NOT NULL DEFAULT 'report',
                data_source  TEXT NOT NULL,
                columns      JSONB NOT NULL DEFAULT '[]',
                filters      JSONB NOT NULL DEFAULT '[]',
                sort_by      TEXT,
                sort_order   TEXT NOT NULL DEFAULT 'asc',
                user_name    TEXT,
                org_code     TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT chk_report_templates_type CHECK (type IN ('report', 'dashboard'))
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_templates_user_name ON report_templates (user_name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates (type)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_templates_org_code ON report_templates (org_code)`)
        console.log('[024] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[024] ERROR:', err.message); process.exit(1) })

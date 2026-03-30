'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_template_audits (
                id                  SERIAL PRIMARY KEY,
                report_template_id  INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
                action              VARCHAR(20) NOT NULL,
                user_name           VARCHAR(255),
                changes             TEXT,
                created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_audits_template ON report_template_audits (report_template_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_audits_created ON report_template_audits (created_at)`)
        console.log('[067] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[067] ERROR:', err.message); process.exit(1) })

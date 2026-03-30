'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS workflow_status_code  VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS clearance_status_code VARCHAR(50) REFERENCES lookup_workflow_statuses(code) ON DELETE SET NULL
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_workflow_status_code ON submission (workflow_status_code)`)
        console.log('[060] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[060] ERROR:', err.message); process.exit(1) })

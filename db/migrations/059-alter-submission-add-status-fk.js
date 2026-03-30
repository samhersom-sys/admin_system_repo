'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            ALTER TABLE submission
                ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES lookup_submission_statuses(id) ON DELETE SET NULL
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_status_id ON submission (status_id)`)
        console.log('[059] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[059] ERROR:', err.message); process.exit(1) })

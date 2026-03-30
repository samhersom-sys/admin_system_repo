'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_template_shares (
                id                      SERIAL PRIMARY KEY,
                report_template_id      INTEGER NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
                shared_by_user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                shared_with_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                permission_level        VARCHAR(20) NOT NULL DEFAULT 'view',
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_report_template_shares_template_user UNIQUE (report_template_id, shared_with_user_id)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_template ON report_template_shares (report_template_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_shared_with ON report_template_shares (shared_with_user_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_report_template_shares_shared_by ON report_template_shares (shared_by_user_id)`)
        console.log('[068] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[068] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_templates (
                template_code    VARCHAR(50) PRIMARY KEY,
                template_name    VARCHAR(100),
                template_subject TEXT,
                template_body    TEXT NOT NULL,
                channel          VARCHAR(50) NOT NULL DEFAULT 'in-app',
                is_active        BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        console.log('[022] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[022] ERROR:', err.message); process.exit(1) })

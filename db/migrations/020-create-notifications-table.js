'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id           SERIAL PRIMARY KEY,
                user_name    TEXT,
                org_code     TEXT,
                type         TEXT NOT NULL DEFAULT 'info',
                message      TEXT NOT NULL DEFAULT '',
                is_read      BOOLEAN NOT NULL DEFAULT FALSE,
                payload      JSONB,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_name ON notifications (user_name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_org_code ON notifications (org_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read)`)
        console.log('[020] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[020] ERROR:', err.message); process.exit(1) })

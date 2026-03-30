'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_messages (
                message_code TEXT PRIMARY KEY,
                message_text TEXT NOT NULL,
                message_type TEXT NOT NULL DEFAULT 'info',
                description  TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_messages_type ON notification_messages (message_type)`)
        console.log('[021] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[021] ERROR:', err.message); process.exit(1) })

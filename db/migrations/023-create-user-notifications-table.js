'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id            SERIAL PRIMARY KEY,
                user_name     VARCHAR(255),
                template_code VARCHAR(50) REFERENCES notification_templates(template_code) ON DELETE CASCADE,
                context_data  JSONB,
                is_read       BOOLEAN NOT NULL DEFAULT FALSE,
                is_dismissed  BOOLEAN NOT NULL DEFAULT FALSE,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                read_at       TIMESTAMPTZ,
                dismissed_at  TIMESTAMPTZ
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_user_name ON user_notifications (user_name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_template_code ON user_notifications (template_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications (created_at DESC)`)
        console.log('[023] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[023] ERROR:', err.message); process.exit(1) })

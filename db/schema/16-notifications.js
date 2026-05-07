'use strict'
/**
 * Schema 16: notifications tables
 * Replaces migrations: 019-create-chat-messages-table, 020-create-notifications-table,
 *                      021-create-notification-messages-table, 022-create-notification-templates-table,
 *                      023-create-user-notifications-table (no alters)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[16-notifications] Creating notification tables...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id              SERIAL PRIMARY KEY,
                sender          TEXT,
                recipient       TEXT,
                message         TEXT,
                conversation_id TEXT,
                payload         JSONB,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages (conversation_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender          ON chat_messages (sender)`)

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id         SERIAL PRIMARY KEY,
                user_name  TEXT,
                org_code   TEXT,
                type       TEXT NOT NULL DEFAULT 'info',
                message    TEXT NOT NULL DEFAULT '',
                is_read    BOOLEAN NOT NULL DEFAULT FALSE,
                payload    JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_name ON notifications (user_name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_org_code  ON notifications (org_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON notifications (is_read)`)

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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_user_name     ON user_notifications (user_name)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_template_code ON user_notifications (template_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at    ON user_notifications (created_at DESC)`)

        console.log('[16-notifications] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[16-notifications] ERROR:', err.message); process.exit(1) })

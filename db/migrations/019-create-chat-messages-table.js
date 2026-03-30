'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender)`)
        console.log('[019] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[019] ERROR:', err.message); process.exit(1) })

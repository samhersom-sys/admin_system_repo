'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_policy_statuses (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(50) NOT NULL UNIQUE,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        console.log('[029] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[029] ERROR:', err.message); process.exit(1) })

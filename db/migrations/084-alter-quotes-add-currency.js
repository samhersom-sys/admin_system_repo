'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[084] Adding quote_currency column to quotes table...')
        await client.query(`
            ALTER TABLE quotes
            ADD COLUMN IF NOT EXISTS quote_currency TEXT NOT NULL DEFAULT 'USD'
        `)
        console.log('[084] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[084] ERROR:', err.message); process.exit(1) })

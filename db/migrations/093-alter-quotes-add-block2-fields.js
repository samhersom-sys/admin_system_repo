'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        // 093: Add Block 2 quote header fields (F-026 to F-032)
        await client.query(`
            ALTER TABLE quotes
                ADD COLUMN IF NOT EXISTS year_of_account        TEXT,
                ADD COLUMN IF NOT EXISTS lta_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS lta_start_date         DATE,
                ADD COLUMN IF NOT EXISTS lta_start_time         TIME DEFAULT '00:00:00',
                ADD COLUMN IF NOT EXISTS lta_expiry_date        DATE,
                ADD COLUMN IF NOT EXISTS lta_expiry_time        TIME DEFAULT '23:59:59',
                ADD COLUMN IF NOT EXISTS contract_type          TEXT,
                ADD COLUMN IF NOT EXISTS method_of_placement    TEXT,
                ADD COLUMN IF NOT EXISTS unique_market_reference TEXT,
                ADD COLUMN IF NOT EXISTS renewable_indicator    TEXT NOT NULL DEFAULT 'No',
                ADD COLUMN IF NOT EXISTS renewal_date           DATE,
                ADD COLUMN IF NOT EXISTS renewal_status         TEXT
        `)
        console.log('[093] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[093] ERROR:', err.message); process.exit(1) })

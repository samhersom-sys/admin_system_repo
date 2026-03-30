'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_classes_of_business (
                id                        SERIAL PRIMARY KEY,
                code                      TEXT NOT NULL UNIQUE,
                name                      TEXT NOT NULL,
                active                    BOOLEAN NOT NULL DEFAULT TRUE,
                requires_locations_schedule BOOLEAN NOT NULL DEFAULT FALSE,
                payload                   JSONB NOT NULL DEFAULT '{}'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_classes_of_business_code ON lookup_classes_of_business (code)`)
        console.log('[037] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[037] ERROR:', err.message); process.exit(1) })

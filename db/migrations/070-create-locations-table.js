'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id              SERIAL PRIMARY KEY,
                quote_id        INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
                country         VARCHAR(100),
                country_code    VARCHAR(3),
                state           VARCHAR(100),
                state_code      VARCHAR(10),
                city            VARCHAR(200),
                address1        TEXT,
                address2        TEXT,
                address3        TEXT,
                zip_code        VARCHAR(20),
                created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by      VARCHAR(255),
                updated_at      TIMESTAMP WITH TIME ZONE,
                updated_by      VARCHAR(255),
                CONSTRAINT uq_locations_quote_address UNIQUE (quote_id, country, state, city, address1, address2, address3)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_quote_id ON locations (quote_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_locations_country_code ON locations (country_code)`)
        console.log('[070] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[070] ERROR:', err.message); process.exit(1) })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS location_premium_adjustments (
                id                       SERIAL PRIMARY KEY,
                location_premium_id      INTEGER NOT NULL REFERENCES location_premium_calculations(id) ON DELETE CASCADE,
                adjustment_type          VARCHAR(20) NOT NULL,
                description              TEXT,
                percentage               NUMERIC(8,5),
                fixed_amount             NUMERIC(15,2),
                calculated_amount        NUMERIC(15,2) NOT NULL,
                applied_at_level         VARCHAR(50),
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by               VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_loc_prem_adjustments_premium_id ON location_premium_adjustments (location_premium_id)`)
        console.log('[057] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[057] ERROR:', err.message); process.exit(1) })

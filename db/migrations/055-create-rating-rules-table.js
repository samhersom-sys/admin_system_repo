'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS rating_rules (
                id                  SERIAL PRIMARY KEY,
                rating_schedule_id  INTEGER NOT NULL REFERENCES rating_schedules(id) ON DELETE CASCADE,
                rule_name           VARCHAR(255),
                description         TEXT,
                field_name          VARCHAR(100) NOT NULL,
                field_source        VARCHAR(50) NOT NULL,
                operator            VARCHAR(20) NOT NULL,
                field_value         TEXT,
                rate_percentage     NUMERIC(10,5) NOT NULL,
                rate_type           VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
                coverage_type_id    INTEGER,
                coverage_sub_type_id INTEGER,
                priority            INTEGER NOT NULL DEFAULT 100,
                is_active           BOOLEAN NOT NULL DEFAULT TRUE,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by          VARCHAR(255),
                updated_at          TIMESTAMPTZ,
                updated_by          VARCHAR(255)
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_rating_rules_schedule_id ON rating_rules (rating_schedule_id)`)
        console.log('[055] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[055] ERROR:', err.message); process.exit(1) })

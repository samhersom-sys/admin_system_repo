'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id            SERIAL PRIMARY KEY,
                dashboard_id  INTEGER NOT NULL,
                template_id   INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
                slot_id       VARCHAR(50) NOT NULL,
                section_id    VARCHAR(100),
                widget_label  VARCHAR(255),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_widgets ON dashboard_widgets (dashboard_id, template_id, slot_id, section_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets (dashboard_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_template_id ON dashboard_widgets (template_id)`)
        console.log('[025] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[025] ERROR:', err.message); process.exit(1) })

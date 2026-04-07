'use strict'
/**
 * Migration 098 — create report_execution_history table.
 *
 * This table was not created by the original Express migrations (only the
 * NestJS TypeORM migration included it). The NestJS ReportingService needs
 * it to record each time a report template is executed.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_execution_history (
                id          SERIAL PRIMARY KEY,
                template_id INT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
                run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                run_by      TEXT,
                row_count   INT,
                status      TEXT NOT NULL DEFAULT 'success'
            )
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_report_exec_history_template
            ON report_execution_history (template_id)
        `)
        console.log('[098] Done — report_execution_history created.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[098] ERROR:', err.message)
    process.exit(1)
})

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        const rows = [
            {
                template_code:    'DATE_SYNC_AVAILABLE',
                template_name:    'Date Sync Available',
                template_subject: 'Policy dates can be synchronised',
                template_body:    'One or more section dates differ from the policy dates. Click Sync to align them.',
                channel:          'in-app',
                is_active:        true,
            },
            {
                template_code:    'VALIDATION_ERROR',
                template_name:    'Validation Error',
                template_subject: 'Form validation failed',
                template_body:    'Please review and correct the highlighted fields before saving.',
                channel:          'in-app',
                is_active:        true,
            },
            {
                template_code:    'SAVE_SUCCESS',
                template_name:    'Save Success',
                template_subject: 'Changes saved',
                template_body:    'Your changes have been saved successfully.',
                channel:          'in-app',
                is_active:        true,
            },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO notification_templates (template_code, template_name, template_subject, template_body, channel, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (template_code) DO NOTHING`,
                [r.template_code, r.template_name, r.template_subject, r.template_body, r.channel, r.is_active]
            )
        }
        console.log('[seed-022] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-022] ERROR:', err.message); process.exit(1) })

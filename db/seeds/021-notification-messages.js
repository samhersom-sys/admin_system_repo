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
            { message_code: 'UNSAVED_QUOTE_CHANGES',    message_text: 'You have unsaved changes on this quote.',                      message_type: 'warning' },
            { message_code: 'SAVE_SUCCESS',             message_text: 'Your changes have been saved successfully.',                   message_type: 'success' },
            { message_code: 'SAVE_FAILED',              message_text: 'Failed to save changes. Please try again.',                    message_type: 'error'   },
            { message_code: 'SUBMISSION_DECLINED',      message_text: 'This submission has been declined.',                           message_type: 'warning' },
            { message_code: 'QUOTE_BOUND',              message_text: 'The quote has been successfully bound to a policy.',           message_type: 'success' },
            { message_code: 'POLICY_EXPIRED',           message_text: 'This policy has expired.',                                    message_type: 'warning' },
            { message_code: 'CLEARANCE_PENDING',        message_text: 'Clearance check is pending for this submission.',             message_type: 'info'    },
            { message_code: 'CLEARANCE_CLEARED',        message_text: 'Submission has passed clearance.',                            message_type: 'success' },
            { message_code: 'CLEARANCE_DUPLICATE',      message_text: 'This submission has been flagged as a duplicate.',            message_type: 'error'   },
            { message_code: 'VALIDATION_ERROR',         message_text: 'Please correct the highlighted fields before continuing.',    message_type: 'error'   },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO notification_messages (message_code, message_text, message_type)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [r.message_code, r.message_text, r.message_type]
            )
        }
        console.log('[seed-021] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-021] ERROR:', err.message); process.exit(1) })

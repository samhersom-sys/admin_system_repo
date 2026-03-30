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
            // Auth
            { error_code: 'AUTH_001', category: 'auth',       severity: 'error',   message_template: 'Authentication failed: invalid credentials.',          resolution_hint: 'Check username and password.' },
            { error_code: 'AUTH_002', category: 'auth',       severity: 'error',   message_template: 'Session has expired.',                                  resolution_hint: 'Please log in again.' },
            { error_code: 'AUTH_003', category: 'auth',       severity: 'error',   message_template: 'Insufficient permissions to perform this action.',      resolution_hint: 'Contact your administrator.' },
            // Submission
            { error_code: 'SUB_001',  category: 'submission', severity: 'error',   message_template: 'Submission not found: {id}.',                           resolution_hint: 'Verify the submission ID.' },
            { error_code: 'SUB_002',  category: 'submission', severity: 'warning', message_template: 'Submission is in a locked state.',                      resolution_hint: 'Unlock before editing.' },
            { error_code: 'SUB_003',  category: 'submission', severity: 'error',   message_template: 'Required fields missing on submission.',                resolution_hint: 'Complete all mandatory fields.' },
            // Quote
            { error_code: 'QTE_001',  category: 'quote',      severity: 'error',   message_template: 'Quote not found: {id}.',                               resolution_hint: 'Verify the quote ID.' },
            { error_code: 'QTE_002',  category: 'quote',      severity: 'error',   message_template: 'Cannot bind quote: status is {status}.',               resolution_hint: 'Quote must be in QUOTED status to bind.' },
            { error_code: 'QTE_003',  category: 'quote',      severity: 'warning', message_template: 'Quote has unsaved changes.',                            resolution_hint: 'Save changes before proceeding.' },
            // Policy
            { error_code: 'POL_001',  category: 'policy',     severity: 'error',   message_template: 'Policy not found: {id}.',                              resolution_hint: 'Verify the policy ID.' },
            { error_code: 'POL_002',  category: 'policy',     severity: 'error',   message_template: 'Cannot endorse expired policy.',                       resolution_hint: 'Renew policy before endorsing.' },
            { error_code: 'POL_003',  category: 'policy',     severity: 'warning', message_template: 'Policy premium sum does not balance.',                 resolution_hint: 'Check section premium allocations.' },
            // Binding Authority
            { error_code: 'BA_001',   category: 'ba',          severity: 'error',   message_template: 'Binding authority not found: {id}.',                   resolution_hint: 'Verify the binding authority ID.' },
            { error_code: 'BA_002',   category: 'ba',          severity: 'error',   message_template: 'Binding authority is not active.',                     resolution_hint: 'Check binding authority status.' },
            { error_code: 'BA_003',   category: 'ba',          severity: 'error',   message_template: 'Risk class {code} not authorized under this binding authority.', resolution_hint: 'Check authorized risk classes.' },
            // Party
            { error_code: 'PRT_001',  category: 'party',       severity: 'error',   message_template: 'Party not found: {id}.',                               resolution_hint: 'Verify the party ID.' },
            { error_code: 'PRT_002',  category: 'party',       severity: 'error',   message_template: 'Duplicate party detected.',                            resolution_hint: 'Use the existing party record.' },
            // Validation
            { error_code: 'VAL_001',  category: 'validation',  severity: 'error',   message_template: 'Field {field} is required.',                           resolution_hint: 'Provide a value for the field.' },
            { error_code: 'VAL_002',  category: 'validation',  severity: 'error',   message_template: 'Field {field} exceeds maximum length of {max}.',       resolution_hint: 'Shorten the value.' },
            { error_code: 'VAL_003',  category: 'validation',  severity: 'error',   message_template: 'Invalid date range: inception must precede expiry.',   resolution_hint: 'Correct the dates.' },
            { error_code: 'VAL_004',  category: 'validation',  severity: 'error',   message_template: 'Premium must be a positive numeric value.',            resolution_hint: 'Enter a valid premium amount.' },
            { error_code: 'VAL_005',  category: 'validation',  severity: 'error',   message_template: 'Percentage values must sum to 100.',                   resolution_hint: 'Adjust allocations.' },
            // Database
            { error_code: 'DB_001',   category: 'database',    severity: 'critical', message_template: 'Database connection failed.',                          resolution_hint: 'Check DB connectivity.' },
            { error_code: 'DB_002',   category: 'database',    severity: 'critical', message_template: 'Transaction rollback: {reason}.',                     resolution_hint: 'Retry the operation.' },
            { error_code: 'DB_003',   category: 'database',    severity: 'error',   message_template: 'Record not found.',                                    resolution_hint: 'Verify the record exists.' },
            // System
            { error_code: 'SYS_001',  category: 'system',      severity: 'critical', message_template: 'Unexpected server error.',                             resolution_hint: 'Contact support.' },
            { error_code: 'SYS_002',  category: 'system',      severity: 'error',   message_template: 'Feature not available in current environment.',         resolution_hint: 'Check environment configuration.' },
            { error_code: 'SYS_003',  category: 'system',      severity: 'warning', message_template: 'Rate limit exceeded. Retry after {seconds}s.',         resolution_hint: 'Wait before retrying.' },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO system_error_catalog (error_code, category, severity, message_template, resolution_hint)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (error_code) DO NOTHING`,
                [r.error_code, r.category, r.severity, r.message_template, r.resolution_hint]
            )
        }
        console.log('[seed-023] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-023] ERROR:', err.message); process.exit(1) })

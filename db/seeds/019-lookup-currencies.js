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
            { code: 'GBP', name: 'British Pound Sterling' },
            { code: 'USD', name: 'US Dollar' },
            { code: 'EUR', name: 'Euro' },
            { code: 'JPY', name: 'Japanese Yen' },
            { code: 'CHF', name: 'Swiss Franc' },
            { code: 'AUD', name: 'Australian Dollar' },
            { code: 'CAD', name: 'Canadian Dollar' },
            { code: 'SGD', name: 'Singapore Dollar' },
            { code: 'HKD', name: 'Hong Kong Dollar' },
            { code: 'NOK', name: 'Norwegian Krone' },
            { code: 'SEK', name: 'Swedish Krona' },
            { code: 'DKK', name: 'Danish Krone' },
            { code: 'NZD', name: 'New Zealand Dollar' },
            { code: 'ZAR', name: 'South African Rand' },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_currencies (code, name, is_active)
                 VALUES ($1, $2, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name]
            )
        }
        console.log('[seed-019] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-019] ERROR:', err.message); process.exit(1) })

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
            { code: 'PROPERTY',  name: 'Property',            active: true, requires_locations: true  },
            { code: 'MARINE',    name: 'Marine',              active: true, requires_locations: false },
            { code: 'CASUALTY',  name: 'Casualty',            active: true, requires_locations: false },
            { code: 'AVIATION',  name: 'Aviation',            active: true, requires_locations: false },
            { code: 'ENERGY',    name: 'Energy',              active: true, requires_locations: true  },
            { code: 'FINANCIAL', name: 'Financial Lines',     active: true, requires_locations: false },
            { code: 'LIABILITY', name: 'Liability',           active: true, requires_locations: false },
            { code: 'ACCIDENT',  name: 'Accident & Health',   active: true, requires_locations: false },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_classes_of_business (code, name, active, requires_locations_schedule)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.active, r.requires_locations]
            )
        }
        console.log('[seed-013] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-013] ERROR:', err.message); process.exit(1) })

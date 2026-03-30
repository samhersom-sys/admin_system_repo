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
            { code: 'CREATED',   name: 'Created',   description: 'Binding authority has been created',          order_index: 1 },
            { code: 'BOUND',     name: 'Bound',     description: 'Binding authority has been bound',            order_index: 2 },
            { code: 'DECLINED',  name: 'Declined',  description: 'Binding authority has been declined',         order_index: 3 },
            { code: 'ACTIVE',    name: 'Active',    description: 'Binding authority is currently active',       order_index: 4 },
            { code: 'CANCELLED', name: 'Cancelled', description: 'Binding authority has been cancelled',        order_index: 5 },
            { code: 'EXPIRED',   name: 'Expired',   description: 'Binding authority term has expired',          order_index: 6 },
            { code: 'LAPSED',    name: 'Lapsed',    description: 'Binding authority has lapsed',               order_index: 7 },
            { code: 'DISBANDED', name: 'Disbanded', description: 'Binding authority has been disbanded',        order_index: 8 },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_binding_authority_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description, r.order_index]
            )
        }
        console.log('[seed-007] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-007] ERROR:', err.message); process.exit(1) })

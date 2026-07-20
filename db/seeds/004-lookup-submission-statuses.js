/**
 * Seed 004 — lookup_submission_statuses
 *
 * THE ONLY seed script for submission status lookups.
 * Status values reflect the full lifecycle: Open → Quoted → Bound → Issued → Active
 * then terminal states: Expired, Cancelled, Lapsed, Renewed, Closed, Disbanded.
 *
 * is_active = false for terminal/inactive states (used to filter active submissions in UI).
 * Safe to run multiple times — uses ON CONFLICT DO UPDATE to keep is_active in sync.
 */
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
            { code: 'OPEN',      name: 'Open',      description: 'Submission is open and awaiting quotes',                      order_index: 1,  is_active: true  },
            { code: 'QUOTED',    name: 'Quoted',    description: 'At least one quote has been provided',                        order_index: 2,  is_active: true  },
            { code: 'BOUND',     name: 'Bound',     description: 'A quote has been bound, pending policy issuance',             order_index: 3,  is_active: true  },
            { code: 'ISSUED',    name: 'Issued',    description: 'Policy has been issued from this submission',                 order_index: 4,  is_active: true  },
            { code: 'ACTIVE',    name: 'Active',    description: 'Linked policy is currently active',                          order_index: 5,  is_active: true  },
            { code: 'EXPIRED',   name: 'Expired',   description: 'Linked policy has expired',                                  order_index: 6,  is_active: false },
            { code: 'CANCELLED', name: 'Cancelled', description: 'Linked policy has been cancelled',                           order_index: 7,  is_active: false },
            { code: 'LAPSED',    name: 'Lapsed',    description: 'Linked policy has lapsed due to non-renewal or non-payment', order_index: 8,  is_active: false },
            { code: 'RENEWED',   name: 'Renewed',   description: 'Submission has been renewed into a new submission',          order_index: 9,  is_active: false },
            { code: 'CLOSED',    name: 'Closed',    description: 'Submission has been closed (all quotes declined)',           order_index: 10, is_active: false },
            { code: 'DISBANDED', name: 'Disbanded', description: 'Submission has been disbanded',                             order_index: 11, is_active: false },
        ]
        for (const r of rows) {
            await client.query(
                `INSERT INTO lookup_submission_statuses (code, name, description, order_index, is_active)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active, order_index = EXCLUDED.order_index`,
                [r.code, r.name, r.description, r.order_index, r.is_active]
            )
        }
        console.log('[seed-004] Done — 11 submission statuses seeded.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-004] ERROR:', err.message); process.exit(1) })

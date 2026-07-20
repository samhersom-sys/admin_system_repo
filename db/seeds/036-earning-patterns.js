'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })

/**
 * Seed 036 — earning_patterns demo data
 *
 * Inserts three representative earning patterns for the demo org so that
 * the Earnings Configuration settings page has data to display on fresh installs.
 *
 * ON CONFLICT DO NOTHING — safe to re-run.
 */

async function run() {
    const client = await pool.connect()
    try {
        // Identify any existing org to use as demo owner (fall back to 'DEMO')
        const orgRow = await client.query(
            `SELECT org_code FROM organisation_entities LIMIT 1`,
        ).catch(() => ({ rows: [] }))
        const orgCode = orgRow.rows[0]?.org_code ?? 'DEMO'

        console.log(`[036] Seeding earning_patterns for org: ${orgCode}`)

        // 1. Upfront pattern
        await client.query(
            `INSERT INTO earning_patterns
               (org_code, name, pattern_type, earn_by, description, is_active)
             VALUES ($1, $2, 'upfront', 'day', $3, true)
             ON CONFLICT DO NOTHING`,
            [
                orgCode,
                'Upfront (Full at Inception)',
                '100% of premium earned on the inception date.',
            ],
        )

        // 2. Straight-line pattern
        await client.query(
            `INSERT INTO earning_patterns
               (org_code, name, pattern_type, earn_by, description, is_active)
             VALUES ($1, $2, 'straight_line', 'day', $3, true)
             ON CONFLICT DO NOTHING`,
            [
                orgCode,
                'Standard Straight Line',
                'Equal premium earned each calendar day over the full policy period.',
            ],
        )

        // 3. Interpolated pattern with sample points
        const intRes = await client.query(
            `INSERT INTO earning_patterns
               (org_code, name, pattern_type, earn_by, description, is_active)
             VALUES ($1, $2, 'interpolated', 'day', $3, true)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
                orgCode,
                'Front-Loaded Interpolated',
                'More premium earned in the first third of the policy period.',
            ],
        )

        if (intRes.rows.length > 0) {
            const patternId = intRes.rows[0].id
            // Three points that sum to 100%:
            //   0–33% of policy: earn 50%
            //  33–66% of policy: earn 35%
            //  66–100% of policy: earn 15%
            const points = [
                { pct_through: '33.3333', pct_increment: '50.0000', sort_order: 0 },
                { pct_through: '66.6667', pct_increment: '35.0000', sort_order: 1 },
                { pct_through: '100.0000', pct_increment: '15.0000', sort_order: 2 },
            ]
            for (const p of points) {
                await client.query(
                    `INSERT INTO earning_pattern_points
                       (pattern_id, pct_through_policy, pct_earned_increment, sort_order)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [patternId, p.pct_through, p.pct_increment, p.sort_order],
                )
            }
        }

        console.log('[036] Earning patterns seeded.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[036] ERROR:', err.message); process.exit(1) })

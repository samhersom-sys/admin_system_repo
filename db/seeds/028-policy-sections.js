/**
 * Seed 028 — policy_sections table
 *
 * THE ONLY seed script for the `policy_sections` table.
 * To change test section data, edit this file. Do NOT create a second policy_sections seed.
 *
 * Safe to run multiple times — all INSERTs check (policy_id, reference) before inserting.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migration 013 must have run (policy_sections table).
 *   - Seed 025-policies.js must have run (policy IDs are looked up by reference).
 *
 * Coverage:
 *   POL-2024-001 (Active, Coastal Shipping)  — 2 sections: Marine Hull, Marine Cargo
 *   POL-2023-001 (Expired)                   — 1 section: Property
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({
    connectionString: DB_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

const SECTIONS = [
    // POL-2024-001 — Marine Hull section
    {
        policyRef: 'POL-2024-001',
        reference: 'POL-2024-001-SEC-001',
        classOfBusiness: 'Marine Hull',
        inceptionDate: '2024-03-01',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        sumInsuredCurrency: 'GBP',
        sumInsured: 6000000.00,
        premiumCurrency: 'GBP',
        grossGrossPremium: 90000.00,
        grossPremium: 90000.00,
        netPremium: 81000.00,
        limitCurrency: 'GBP',
        limitAmount: 6000000.00,
    },
    // POL-2024-001 — Marine Cargo section
    {
        policyRef: 'POL-2024-001',
        reference: 'POL-2024-001-SEC-002',
        classOfBusiness: 'Marine Cargo',
        inceptionDate: '2024-03-01',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        sumInsuredCurrency: 'GBP',
        sumInsured: 1500000.00,
        premiumCurrency: 'GBP',
        grossGrossPremium: 25000.00,
        grossPremium: 25000.00,
        netPremium: 22500.00,
        limitCurrency: 'GBP',
        limitAmount: 1500000.00,
    },
    // POL-2023-001 (Expired) — Property section
    {
        policyRef: 'POL-2023-001',
        reference: 'POL-2023-001-SEC-001',
        classOfBusiness: 'Property',
        inceptionDate: '2023-01-01',
        effectiveDate: '2023-01-01',
        expiryDate: '2023-12-31',
        daysOnCover: 365,
        sumInsuredCurrency: 'GBP',
        sumInsured: 3500000.00,
        premiumCurrency: 'GBP',
        grossGrossPremium: 52500.00,
        grossPremium: 52500.00,
        netPremium: 47250.00,
        limitCurrency: 'GBP',
        limitAmount: 3500000.00,
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-028] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 028 — policy_sections] Inserting test sections...')
        let inserted = 0
        let skipped = 0

        for (const s of SECTIONS) {
            const policyRows = await client.query(
                `SELECT id FROM policies WHERE reference = $1`,
                [s.policyRef],
            )
            if (!policyRows.rows.length) {
                console.warn(`  SKIP — policy ${s.policyRef} not found`)
                skipped++
                continue
            }
            const policyId = policyRows.rows[0].id

            const exists = await client.query(
                `SELECT id FROM policy_sections WHERE policy_id = $1 AND reference = $2`,
                [policyId, s.reference],
            )
            if (exists.rows.length) {
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO policy_sections
                    (policy_id, reference, class_of_business,
                     inception_date, effective_date, expiry_date, days_on_cover,
                     sum_insured_currency, sum_insured,
                     premium_currency, gross_gross_premium, gross_premium, net_premium,
                     limit_currency, limit_amount,
                     is_current, created_at)
                 VALUES
                    ($1, $2, $3,
                     $4, $5, $6, $7,
                     $8, $9,
                     $10, $11, $12, $13,
                     $14, $15,
                     TRUE, NOW())`,
                [
                    policyId, s.reference, s.classOfBusiness,
                    s.inceptionDate, s.effectiveDate, s.expiryDate, s.daysOnCover,
                    s.sumInsuredCurrency, s.sumInsured,
                    s.premiumCurrency, s.grossGrossPremium, s.grossPremium, s.netPremium,
                    s.limitCurrency, s.limitAmount,
                ],
            )
            console.log(`  + ${s.reference}`)
            inserted++
        }

        console.log(`[Seed 028] Done — ${inserted} inserted, ${skipped} skipped.`)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[Seed 028] ERROR:', err.message)
    process.exit(1)
})

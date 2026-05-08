/**
 * Seed 030 — policy_section_coverages table
 *
 * THE ONLY seed script for the `policy_section_coverages` table.
 * To change test coverage data, edit this file. Do NOT create a second policy_section_coverages seed.
 *
 * Safe to run multiple times — all INSERTs check (section_id, reference) before inserting.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migration 099 must have run (policy_section_coverages table, renamed from policy_coverages).
 *   - Seed 028-policy-sections.js must have run (section IDs are looked up by reference).
 *   - Seed 025-policies.js must have run (policy IDs are looked up by reference).
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

const COVERAGES = [
    // POL-2024-001-SEC-001 (Marine Hull) → 2 coverages
    {
        policyRef: 'POL-2024-001',
        sectionRef: 'POL-2024-001-SEC-001',
        reference: 'POL-2024-001-SEC-001-COV-001',
        coverage: 'Hull & Machinery',
        classOfBusiness: 'Marine Hull',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        limitCurrency: 'GBP',
        limitAmount: 6000000.00,
        sumInsuredCurrency: 'GBP',
        sumInsured: 6000000.00,
        premiumCurrency: 'GBP',
        grossPremium: 72000.00,
        netPremium: 64800.00,
    },
    {
        policyRef: 'POL-2024-001',
        sectionRef: 'POL-2024-001-SEC-001',
        reference: 'POL-2024-001-SEC-001-COV-002',
        coverage: 'Protection & Indemnity',
        classOfBusiness: 'Marine Hull',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        limitCurrency: 'GBP',
        limitAmount: null,
        sumInsuredCurrency: 'GBP',
        sumInsured: null,
        premiumCurrency: 'GBP',
        grossPremium: 18000.00,
        netPremium: 16200.00,
    },
    // POL-2024-001-SEC-002 (Marine Cargo) → 2 coverages
    {
        policyRef: 'POL-2024-001',
        sectionRef: 'POL-2024-001-SEC-002',
        reference: 'POL-2024-001-SEC-002-COV-001',
        coverage: 'Institute Cargo Clauses A',
        classOfBusiness: 'Marine Cargo',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        limitCurrency: 'GBP',
        limitAmount: 1500000.00,
        sumInsuredCurrency: 'GBP',
        sumInsured: 1500000.00,
        premiumCurrency: 'GBP',
        grossPremium: 20000.00,
        netPremium: 18000.00,
    },
    {
        policyRef: 'POL-2024-001',
        sectionRef: 'POL-2024-001-SEC-002',
        reference: 'POL-2024-001-SEC-002-COV-002',
        coverage: 'War & Strikes',
        classOfBusiness: 'Marine Cargo',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-02-28',
        daysOnCover: 365,
        limitCurrency: 'GBP',
        limitAmount: 1500000.00,
        sumInsuredCurrency: 'GBP',
        sumInsured: 1500000.00,
        premiumCurrency: 'GBP',
        grossPremium: 5000.00,
        netPremium: 4500.00,
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-030] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 030 — policy_section_coverages] Inserting test coverages...')
        let inserted = 0
        let skipped = 0

        for (const c of COVERAGES) {
            // Resolve policy_id
            const policyRows = await client.query(
                `SELECT id FROM policies WHERE reference = $1`,
                [c.policyRef],
            )
            if (!policyRows.rows.length) {
                console.warn(`  SKIP — policy ${c.policyRef} not found`)
                skipped++
                continue
            }
            const policyId = policyRows.rows[0].id

            // Resolve section_id
            const sectionRows = await client.query(
                `SELECT id FROM policy_sections WHERE policy_id = $1 AND reference = $2`,
                [policyId, c.sectionRef],
            )
            if (!sectionRows.rows.length) {
                console.warn(`  SKIP — section ${c.sectionRef} not found`)
                skipped++
                continue
            }
            const sectionId = sectionRows.rows[0].id

            const exists = await client.query(
                `SELECT id FROM policy_section_coverages WHERE section_id = $1 AND reference = $2`,
                [sectionId, c.reference],
            )
            if (exists.rows.length) {
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO policy_section_coverages
                    (policy_id, section_id, reference, coverage, class_of_business,
                     effective_date, expiry_date, days_on_cover,
                     limit_currency, limit_amount,
                     sum_insured_currency, sum_insured,
                     premium_currency, gross_premium, net_premium,
                     created_at)
                 VALUES
                    ($1, $2, $3, $4, $5,
                     $6, $7, $8,
                     $9, $10,
                     $11, $12,
                     $13, $14, $15,
                     NOW())`,
                [
                    policyId, sectionId, c.reference, c.coverage, c.classOfBusiness,
                    c.effectiveDate, c.expiryDate, c.daysOnCover,
                    c.limitCurrency, c.limitAmount ?? null,
                    c.sumInsuredCurrency, c.sumInsured ?? null,
                    c.premiumCurrency, c.grossPremium, c.netPremium,
                ],
            )
            console.log(`  + ${c.reference}`)
            inserted++
        }

        console.log(`[Seed 030] Done — ${inserted} inserted, ${skipped} skipped.`)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[Seed 030] ERROR:', err.message)
    process.exit(1)
})

/**
 * Seed 029 — quote_section_coverages table
 *
 * THE ONLY seed script for the `quote_section_coverages` table.
 * To change test coverage data, edit this file. Do NOT create a second quote_section_coverages seed.
 *
 * Safe to run multiple times — all INSERTs check (section_id, reference) before inserting.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migration 100 must have run (quote_section_coverages table).
 *   - Seed 027-quote-sections.js must have run (section IDs are looked up by reference).
 *   - Seed 024-quotes.js must have run (quote IDs are looked up by reference).
 *
 * Coverage pattern:
 *   Each quote section gets 2 coverages using the reference format:
 *   {sectionRef}-COV-001, {sectionRef}-COV-002
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

// sectionRef is used to look up both quote_id and section_id at runtime
const COVERAGES = [
    // QUO-2024-001-SEC-001 (Property) → 2 coverages
    {
        sectionRef: 'QUO-2024-001-SEC-001',
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-001-COV-001',
        coverage: 'All Risks',
        classOfBusiness: 'Property',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        limitCurrency: 'USD',
        limitAmount: 3000000.00,
        sumInsuredCurrency: 'USD',
        sumInsured: 3000000.00,
        premiumCurrency: 'USD',
        grossPremium: 45000.00,
        netPremium: 40500.00,
    },
    {
        sectionRef: 'QUO-2024-001-SEC-001',
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-001-COV-002',
        coverage: 'Business Interruption',
        classOfBusiness: 'Property',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        limitCurrency: 'USD',
        limitAmount: 2000000.00,
        sumInsuredCurrency: 'USD',
        sumInsured: 2000000.00,
        premiumCurrency: 'USD',
        grossPremium: 30000.00,
        netPremium: 27000.00,
    },
    // QUO-2024-001-SEC-002 (Liability) → 2 coverages
    {
        sectionRef: 'QUO-2024-001-SEC-002',
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-002-COV-001',
        coverage: 'Public Liability',
        classOfBusiness: 'Liability',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        limitCurrency: 'USD',
        limitAmount: 10000000.00,
        sumInsuredCurrency: 'USD',
        sumInsured: 2000000.00,
        premiumCurrency: 'USD',
        grossPremium: 20000.00,
        netPremium: 18000.00,
    },
    {
        sectionRef: 'QUO-2024-001-SEC-002',
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-002-COV-002',
        coverage: 'Employers Liability',
        classOfBusiness: 'Liability',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        limitCurrency: 'USD',
        limitAmount: 5000000.00,
        sumInsuredCurrency: 'USD',
        sumInsured: null,
        premiumCurrency: 'USD',
        grossPremium: 10000.00,
        netPremium: 9000.00,
    },
    // QUO-2024-003-SEC-001 (Marine Hull, Bound) → 2 coverages
    {
        sectionRef: 'QUO-2024-003-SEC-001',
        quoteRef: 'QUO-2024-003',
        reference: 'QUO-2024-003-SEC-001-COV-001',
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
        sectionRef: 'QUO-2024-003-SEC-001',
        quoteRef: 'QUO-2024-003',
        reference: 'QUO-2024-003-SEC-001-COV-002',
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
    // QUO-2025-001-SEC-001 (Property, EUR) → 2 coverages
    {
        sectionRef: 'QUO-2025-001-SEC-001',
        quoteRef: 'QUO-2025-001',
        reference: 'QUO-2025-001-SEC-001-COV-001',
        coverage: 'All Risks',
        classOfBusiness: 'Property',
        effectiveDate: '2025-05-01',
        expiryDate: '2026-04-30',
        daysOnCover: 365,
        limitCurrency: 'EUR',
        limitAmount: 12000000.00,
        sumInsuredCurrency: 'EUR',
        sumInsured: 12000000.00,
        premiumCurrency: 'EUR',
        grossPremium: 144000.00,
        netPremium: 129600.00,
    },
    {
        sectionRef: 'QUO-2025-001-SEC-001',
        quoteRef: 'QUO-2025-001',
        reference: 'QUO-2025-001-SEC-001-COV-002',
        coverage: 'Business Interruption',
        classOfBusiness: 'Property',
        effectiveDate: '2025-05-01',
        expiryDate: '2026-04-30',
        daysOnCover: 365,
        limitCurrency: 'EUR',
        limitAmount: 4000000.00,
        sumInsuredCurrency: 'EUR',
        sumInsured: 4000000.00,
        premiumCurrency: 'EUR',
        grossPremium: 36000.00,
        netPremium: 32400.00,
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-029] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 029 — quote_section_coverages] Inserting test coverages...')
        let inserted = 0
        let skipped = 0

        for (const c of COVERAGES) {
            // Resolve quote_id
            const quoteRows = await client.query(
                `SELECT id FROM quotes WHERE reference = $1`,
                [c.quoteRef],
            )
            if (!quoteRows.rows.length) {
                console.warn(`  SKIP — quote ${c.quoteRef} not found`)
                skipped++
                continue
            }
            const quoteId = quoteRows.rows[0].id

            // Resolve section_id
            const sectionRows = await client.query(
                `SELECT id FROM quote_sections WHERE quote_id = $1 AND reference = $2`,
                [quoteId, c.sectionRef],
            )
            if (!sectionRows.rows.length) {
                console.warn(`  SKIP — section ${c.sectionRef} not found`)
                skipped++
                continue
            }
            const sectionId = sectionRows.rows[0].id

            const exists = await client.query(
                `SELECT id FROM quote_section_coverages WHERE section_id = $1 AND reference = $2`,
                [sectionId, c.reference],
            )
            if (exists.rows.length) {
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO quote_section_coverages
                    (quote_id, section_id, reference, coverage, class_of_business,
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
                    quoteId, sectionId, c.reference, c.coverage, c.classOfBusiness,
                    c.effectiveDate, c.expiryDate, c.daysOnCover,
                    c.limitCurrency, c.limitAmount ?? null,
                    c.sumInsuredCurrency, c.sumInsured ?? null,
                    c.premiumCurrency, c.grossPremium, c.netPremium,
                ],
            )
            console.log(`  + ${c.reference}`)
            inserted++
        }

        console.log(`[Seed 029] Done — ${inserted} inserted, ${skipped} skipped.`)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[Seed 029] ERROR:', err.message)
    process.exit(1)
})

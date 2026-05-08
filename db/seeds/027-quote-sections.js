/**
 * Seed 027 — quote_sections table
 *
 * THE ONLY seed script for the `quote_sections` table.
 * To change test section data, edit this file. Do NOT create a second quote_sections seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT DO NOTHING on reference + quote_id.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migration 012 must have run (quote_sections table).
 *   - Seed 024-quotes.js must have run (quote IDs are looked up by reference).
 *
 * Coverage:
 *   QUO-2024-001 (Draft, Acme Corp)         — 2 sections: Property, Liability
 *   QUO-2024-002 (Quoted, Global Electronics)— 2 sections: Property, Marine Cargo
 *   QUO-2024-003 (Bound, Coastal Shipping)  — 2 sections: Marine Hull, Marine Cargo
 *   QUO-2025-001 (Draft, Skyline Hospitality)— 1 section: Property
 *   QUO-2025-D02 (Quoted, Demo Logistics)   — 1 section: Liability
 *
 * Note: QUO-2025-D01 (Draft) and QUO-2024-004 (Declined) intentionally have no sections.
 *   Draft quotes may have no sections yet. Declined quotes were rejected before sections.
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

// reference format: {quoteRef}-SEC-NNN
const SECTIONS = [
    // QUO-2024-001 — Property section
    {
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-001',
        classOfBusiness: 'Property',
        inceptionDate: '2024-01-15',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        sumInsuredCurrency: 'USD',
        sumInsured: 5000000.00,
        premiumCurrency: 'USD',
        grossGrossPremium: 75000.00,
        grossPremium: 75000.00,
        netPremium: 67500.00,
        limitCurrency: 'USD',
        limitAmount: 5000000.00,
    },
    // QUO-2024-001 — Liability section
    {
        quoteRef: 'QUO-2024-001',
        reference: 'QUO-2024-001-SEC-002',
        classOfBusiness: 'Liability',
        inceptionDate: '2024-01-15',
        effectiveDate: '2024-01-15',
        expiryDate: '2025-01-14',
        daysOnCover: 365,
        sumInsuredCurrency: 'USD',
        sumInsured: 2000000.00,
        premiumCurrency: 'USD',
        grossGrossPremium: 30000.00,
        grossPremium: 30000.00,
        netPremium: 27000.00,
        limitCurrency: 'USD',
        limitAmount: 10000000.00,
    },
    // QUO-2024-002 — Property section
    {
        quoteRef: 'QUO-2024-002',
        reference: 'QUO-2024-002-SEC-001',
        classOfBusiness: 'Property',
        inceptionDate: '2024-02-01',
        effectiveDate: '2024-02-01',
        expiryDate: '2025-01-31',
        daysOnCover: 365,
        sumInsuredCurrency: 'USD',
        sumInsured: 8000000.00,
        premiumCurrency: 'USD',
        grossGrossPremium: 120000.00,
        grossPremium: 120000.00,
        netPremium: 108000.00,
        limitCurrency: 'USD',
        limitAmount: 8000000.00,
    },
    // QUO-2024-002 — Marine Cargo section
    {
        quoteRef: 'QUO-2024-002',
        reference: 'QUO-2024-002-SEC-002',
        classOfBusiness: 'Marine Cargo',
        inceptionDate: '2024-02-01',
        effectiveDate: '2024-02-01',
        expiryDate: '2025-01-31',
        daysOnCover: 365,
        sumInsuredCurrency: 'USD',
        sumInsured: 3000000.00,
        premiumCurrency: 'USD',
        grossGrossPremium: 45000.00,
        grossPremium: 45000.00,
        netPremium: 40500.00,
        limitCurrency: 'USD',
        limitAmount: 3000000.00,
    },
    // QUO-2024-003 (Bound) — Marine Hull section
    {
        quoteRef: 'QUO-2024-003',
        reference: 'QUO-2024-003-SEC-001',
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
    // QUO-2024-003 (Bound) — Marine Cargo section
    {
        quoteRef: 'QUO-2024-003',
        reference: 'QUO-2024-003-SEC-002',
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
    // QUO-2025-001 — Property section (EUR)
    {
        quoteRef: 'QUO-2025-001',
        reference: 'QUO-2025-001-SEC-001',
        classOfBusiness: 'Property',
        inceptionDate: '2025-05-01',
        effectiveDate: '2025-05-01',
        expiryDate: '2026-04-30',
        daysOnCover: 365,
        sumInsuredCurrency: 'EUR',
        sumInsured: 12000000.00,
        premiumCurrency: 'EUR',
        grossGrossPremium: 180000.00,
        grossPremium: 180000.00,
        netPremium: 162000.00,
        limitCurrency: 'EUR',
        limitAmount: 12000000.00,
    },
    // QUO-2025-D02 (Quoted, Demo Logistics) — Liability section
    // Referential integrity: a Quoted quote must have at least one section.
    {
        quoteRef: 'QUO-2025-D02',
        reference: 'QUO-2025-D02-SEC-001',
        classOfBusiness: 'Liability',
        inceptionDate: '2025-07-01',
        effectiveDate: '2025-07-01',
        expiryDate: '2026-06-30',
        daysOnCover: 365,
        sumInsuredCurrency: 'GBP',
        sumInsured: 5000000.00,
        premiumCurrency: 'GBP',
        grossGrossPremium: 55000.00,
        grossPremium: 55000.00,
        netPremium: 49500.00,
        limitCurrency: 'GBP',
        limitAmount: 10000000.00,
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-027] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 027 — quote_sections] Inserting test sections...')
        let inserted = 0
        let skipped = 0

        for (const s of SECTIONS) {
            // Resolve parent quote ID by reference
            const quoteRows = await client.query(
                `SELECT id FROM quotes WHERE reference = $1`,
                [s.quoteRef],
            )
            if (!quoteRows.rows.length) {
                console.warn(`  SKIP — quote ${s.quoteRef} not found`)
                skipped++
                continue
            }
            const quoteId = quoteRows.rows[0].id

            // Upsert on (quote_id, reference)
            const exists = await client.query(
                `SELECT id FROM quote_sections WHERE quote_id = $1 AND reference = $2`,
                [quoteId, s.reference],
            )
            if (exists.rows.length) {
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO quote_sections
                    (quote_id, reference, class_of_business,
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
                    quoteId, s.reference, s.classOfBusiness,
                    s.inceptionDate, s.effectiveDate, s.expiryDate, s.daysOnCover,
                    s.sumInsuredCurrency, s.sumInsured,
                    s.premiumCurrency, s.grossGrossPremium, s.grossPremium, s.netPremium,
                    s.limitCurrency, s.limitAmount,
                ],
            )
            console.log(`  + ${s.reference}`)
            inserted++
        }

        console.log(`[Seed 027] Done — ${inserted} inserted, ${skipped} skipped.`)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[Seed 027] ERROR:', err.message)
    process.exit(1)
})

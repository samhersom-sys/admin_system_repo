/**
 * Seed 025 — policies table
 *
 * THE ONLY seed script for the `policies` table.
 * To change test policy data, edit this file. Do NOT create a second policies seed.
 *
 * Safe to run multiple times — all INSERTs check by reference before inserting.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 001–009 must have been run first.
 *   - Seed 024-quotes.js must have been run (policies reference quote IDs).
 *   - Seed 003-submissions.js must have been run (policies reference submission IDs).
 *
 * Referential integrity:
 *   - quote_id looks up from QUO-2024-003 (Bound quote → Coastal Shipping PLC)
 *   - submission_id looks up from SUB-2024-003 (Bound submission → same insured)
 *   - Status coverage: Active, Expired, Cancelled
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// Test policy data
//
// Status coverage (required — do not remove any status):
//   Active    — POL-2024-001 (linked to Bound quote QUO-2024-003)
//   Expired   — POL-2023-001, POL-2024-D01..D06
//   Cancelled — POL-2023-002
//
// DEMO org policies (populates GWP charts for DEMO-org users):
//   2024 YoA  — POL-2024-D01..D06   (6 policies, Jan–Jun, GWP total: £683k)
//   2025 YoA  — POL-2025-D01..D12   (12 policies, Jan–Dec, GWP total: £1.68M)
//   2026 YoA  — POL-2026-D01..D04   (4 policies, Jan–Apr, GWP total: £650k)
// ---------------------------------------------------------------------------

const POLICIES = [
    // ------------------------------------------------------------------
    // Original 3 policies (status coverage: Active, Expired, Cancelled)
    // ------------------------------------------------------------------
    {
        reference: 'POL-2024-001',
        quoteRef: 'QUO-2024-003',
        submissionRef: 'SUB-2024-003',
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Aon Risk Solutions',
        inceptionDate: '2024-03-01',
        expiryDate: '2025-02-28',
        grossWrittenPremium: 125000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    {
        reference: 'POL-2023-001',
        quoteRef: null,
        submissionRef: null,
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Best Brokers Ltd',
        inceptionDate: '2023-01-15',
        expiryDate: '2024-01-14',
        grossWrittenPremium: 95000.00,
        status: 'Expired',
        businessType: 'Insurance',
        contractType: 'Policy Contract',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    {
        reference: 'POL-2023-002',
        quoteRef: null,
        submissionRef: null,
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Marsh Ltd',
        inceptionDate: '2023-06-01',
        expiryDate: '2024-05-31',
        grossWrittenPremium: 78000.00,
        status: 'Cancelled',
        businessType: 'Insurance',
        contractType: 'Policy Contract',
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
    },

    // ------------------------------------------------------------------
    // DEMO org policies — populates GWP charts for DEMO users
    //
    // 2025 YoA: 12 policies spread across all 12 months (Jan–Dec)
    // 2026 YoA: 4 policies (Jan–Apr) for current-year comparison
    // 2024 YoA: 6 policies spread across H1 for prior-year comparison
    // ------------------------------------------------------------------

    // ── 2025 Year of Account ──────────────────────────────────────────
    {
        reference: 'POL-2025-D01',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-01-10',
        expiryDate: '2026-01-09',
        grossWrittenPremium: 85000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D02',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Logistics Ltd',
        insuredId: 'PTY-INS-D02',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-02-05',
        expiryDate: '2026-02-04',
        grossWrittenPremium: 62000.00,
        status: 'Active',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D03',
        quoteRef: null, submissionRef: null,
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-03-12',
        expiryDate: '2026-03-11',
        grossWrittenPremium: 110000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D04',
        quoteRef: null, submissionRef: null,
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-04-01',
        expiryDate: '2026-03-31',
        grossWrittenPremium: 175000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D05',
        quoteRef: null, submissionRef: null,
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-05-15',
        expiryDate: '2026-05-14',
        grossWrittenPremium: 230000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D06',
        quoteRef: null, submissionRef: null,
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-06-01',
        expiryDate: '2026-05-31',
        grossWrittenPremium: 145000.00,
        status: 'Active',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D07',
        quoteRef: null, submissionRef: null,
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-07-10',
        expiryDate: '2026-07-09',
        grossWrittenPremium: 92000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D08',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-08-20',
        expiryDate: '2026-08-19',
        grossWrittenPremium: 58000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D09',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Logistics Ltd',
        insuredId: 'PTY-INS-D02',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-09-05',
        expiryDate: '2026-09-04',
        grossWrittenPremium: 200000.00,
        status: 'Active',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D10',
        quoteRef: null, submissionRef: null,
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-10-15',
        expiryDate: '2026-10-14',
        grossWrittenPremium: 135000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D11',
        quoteRef: null, submissionRef: null,
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2025-11-01',
        expiryDate: '2026-10-31',
        grossWrittenPremium: 78000.00,
        status: 'Active',
        businessType: 'Insurance',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2025-D12',
        quoteRef: null, submissionRef: null,
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2025-12-10',
        expiryDate: '2026-12-09',
        grossWrittenPremium: 310000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },

    // ── 2026 Year of Account (current year — Jan–Apr) ─────────────────
    {
        reference: 'POL-2026-D01',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2026-01-08',
        expiryDate: '2027-01-07',
        grossWrittenPremium: 150000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2026-D02',
        quoteRef: null, submissionRef: null,
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2026-02-14',
        expiryDate: '2027-02-13',
        grossWrittenPremium: 220000.00,
        status: 'Active',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2026-D03',
        quoteRef: null, submissionRef: null,
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2026-03-01',
        expiryDate: '2027-02-28',
        grossWrittenPremium: 95000.00,
        status: 'Active',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2026-D04',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Logistics Ltd',
        insuredId: 'PTY-INS-D02',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2026-04-05',
        expiryDate: '2027-04-04',
        grossWrittenPremium: 185000.00,
        status: 'Active',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },

    // ── 2024 Year of Account (prior year for comparison — H1) ─────────
    {
        reference: 'POL-2024-D01',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2024-01-20',
        expiryDate: '2025-01-19',
        grossWrittenPremium: 72000.00,
        status: 'Expired',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2024-D02',
        quoteRef: null, submissionRef: null,
        insured: 'Demo Logistics Ltd',
        insuredId: 'PTY-INS-D02',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2024-02-10',
        expiryDate: '2025-02-09',
        grossWrittenPremium: 48000.00,
        status: 'Expired',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2024-D03',
        quoteRef: null, submissionRef: null,
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2024-03-15',
        expiryDate: '2025-03-14',
        grossWrittenPremium: 165000.00,
        status: 'Expired',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2024-D04',
        quoteRef: null, submissionRef: null,
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2024-04-01',
        expiryDate: '2025-03-31',
        grossWrittenPremium: 115000.00,
        status: 'Expired',
        businessType: 'Property',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2024-D05',
        quoteRef: null, submissionRef: null,
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Demo Brokers Ltd',
        inceptionDate: '2024-05-20',
        expiryDate: '2025-05-19',
        grossWrittenPremium: 195000.00,
        status: 'Expired',
        businessType: 'Marine',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'POL-2024-D06',
        quoteRef: null, submissionRef: null,
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        placingBroker: 'Demo Risk Partners',
        inceptionDate: '2024-06-15',
        expiryDate: '2025-06-14',
        grossWrittenPremium: 88000.00,
        status: 'Expired',
        businessType: 'Liability',
        contractType: 'Policy Contract',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-025] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 025 — policies] Inserting test policies...')
        let inserted = 0
        let skipped = 0

        for (const p of POLICIES) {
            // Look up quote_id if quoteRef is specified
            let quoteId = null
            if (p.quoteRef) {
                const qRes = await client.query(
                    `SELECT id FROM quotes WHERE reference = $1 LIMIT 1`,
                    [p.quoteRef]
                )
                if (qRes.rows.length > 0) quoteId = qRes.rows[0].id
            }

            // Look up submission_id if submissionRef is specified
            let submissionId = null
            if (p.submissionRef) {
                const sRes = await client.query(
                    `SELECT id FROM submission WHERE reference = $1 LIMIT 1`,
                    [p.submissionRef]
                )
                if (sRes.rows.length > 0) submissionId = sRes.rows[0].id
            }

            const existing = await client.query(
                `SELECT id FROM policies WHERE reference = $1`,
                [p.reference]
            )
            if (existing.rows.length > 0) {
                console.log(`  ⊘ ${p.reference} — already exists (skipped)`)
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO policies (
                    reference, quote_id, submission_id, insured, insured_id,
                    placing_broker, inception_date, expiry_date,
                    gross_written_premium, status, business_type, contract_type,
                    created_by, created_by_org_code
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    p.reference, quoteId, submissionId, p.insured, p.insuredId,
                    p.placingBroker, p.inceptionDate, p.expiryDate,
                    p.grossWrittenPremium, p.status, p.businessType, p.contractType,
                    p.createdBy, p.createdByOrgCode,
                ]
            )
            console.log(`  ✅ ${p.reference} (${p.status}) — inserted`)
            inserted++
        }

        console.log(`[Seed 025 — policies] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 025 — policies] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

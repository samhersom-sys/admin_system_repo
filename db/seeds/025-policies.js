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
//   Expired   — POL-2023-001
//   Cancelled — POL-2023-002
// ---------------------------------------------------------------------------

const POLICIES = [
    {
        reference: 'POL-2024-001',
        quoteRef: 'QUO-2024-003',         // looked up at runtime
        submissionRef: 'SUB-2024-003',     // looked up at runtime
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

/**
 * Seed 003 — submission table
 *
 * THE ONLY seed script for the `submission` table.
 * To change test submission data, edit this file. Do NOT create a second submissions seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT DO NOTHING.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 001–005 must have been run first.
 *   - Seed 002-parties.js must have been run first (submissions reference party insuredId values).
 *
 * Referential integrity:
 *   - Every insuredId value below must exist as a party reference in 002-parties.js.
 *   - Every createdByOrgCode must match an orgCode that exists in 002-parties.js.
 *   - Business rule coverage: seed data includes submissions in each lifecycle status
 *     (Open, Quoted, Bound, Declined) to support UI and API test assertions.
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// Test submission data
//
// Status coverage (required — do not remove any status):
//   Open      — SUB-2024-001, SUB-2024-005, SUB-2025-001, SUB-2025-003
//   Quoted    — SUB-2024-002, SUB-2025-002
//   Bound     — SUB-2024-003
//   Declined  — SUB-2024-004
// ---------------------------------------------------------------------------

const SUBMISSIONS = [
    {
        reference: 'SUB-2024-001',
        submissionType: 'Submission',
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',      // must exist in 002-parties.js
        placingBroker: 'Best Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2024-01-15',
        expiryDate: '2025-01-14',
        status: 'Open',
        createdDate: '2024-01-10',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    {
        reference: 'SUB-2024-002',
        submissionType: 'Submission',
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Marsh Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2024-02-01',
        expiryDate: '2025-01-31',
        status: 'Quoted',
        createdDate: '2024-01-22',
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
    },
    {
        reference: 'SUB-2024-003',
        submissionType: 'Submission',
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Aon Risk Solutions',
        contractType: 'Policy Contract',
        inceptionDate: '2024-03-01',
        expiryDate: '2025-02-28',
        status: 'Bound',
        createdDate: '2024-02-12',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    {
        reference: 'SUB-2024-004',
        submissionType: 'Submission',
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        placingBroker: 'Aon Risk Solutions',
        contractType: 'Policy Contract',
        inceptionDate: '2024-04-01',
        expiryDate: '2025-03-31',
        status: 'Declined',
        createdDate: '2024-03-05',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    {
        reference: 'SUB-2024-005',
        submissionType: 'Submission',
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Willis Towers Watson',
        contractType: 'Policy Contract',
        inceptionDate: '2024-05-01',
        expiryDate: '2025-04-30',
        status: 'Open',
        createdDate: '2024-04-18',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
    {
        reference: 'SUB-2025-001',
        submissionType: 'Submission',
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Best Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2025-01-15',
        expiryDate: '2026-01-14',
        status: 'Open',
        createdDate: '2025-01-08',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    {
        reference: 'SUB-2025-002',
        submissionType: 'Submission',
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Marsh Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2025-02-01',
        expiryDate: '2026-01-31',
        status: 'Quoted',
        createdDate: '2025-01-20',
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
    },
    {
        reference: 'SUB-2025-003',
        submissionType: 'Delegated Authority',
        insured: 'Global Coverholder Ltd',
        insuredId: 'PTY-CVH-001',
        placingBroker: 'Best Brokers Ltd',
        contractType: 'Delegated Authority',
        inceptionDate: '2025-03-01',
        expiryDate: '2026-02-28',
        status: 'Open',
        createdDate: '2025-02-15',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-003] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 003 — submissions] Inserting test submissions...')
        let inserted = 0
        let skipped = 0

        for (const s of SUBMISSIONS) {
            const result = await client.query(
                `INSERT INTO submission
                   (reference, "submissionType", insured, "insuredId",
                    "placingBroker", "contractType",
                    "inceptionDate", "expiryDate",
                    status, "createdDate", "createdBy", "createdByOrgCode")
                 VALUES
                   ($1, $2, $3, $4,
                    $5, $6,
                    $7, $8,
                    $9, $10, $11, $12)
                 ON CONFLICT DO NOTHING
                 RETURNING id, reference`,
                [
                    s.reference, s.submissionType, s.insured, s.insuredId,
                    s.placingBroker, s.contractType,
                    s.inceptionDate, s.expiryDate,
                    s.status, s.createdDate, s.createdBy, s.createdByOrgCode,
                ]
            )
            if (result.rowCount > 0) {
                console.log(`  ✅ ${s.reference} (${s.insured} / ${s.status}) — inserted (id: ${result.rows[0].id})`)
                inserted++
            } else {
                console.log(`  ⊘ ${s.reference} — already exists (skipped)`)
                skipped++
            }
        }

        console.log(`[Seed 003 — submissions] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 003 — submissions] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

/**
 * Seed 003 — submission table
 *
 * THE ONLY seed script for the `submission` table.
 * To change test submission data, edit this file. Do NOT create a second submissions seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT (reference) DO NOTHING.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 001–005 must have been run first.
 *   - Seed 002-parties.js must have been run first (submissions reference party insuredId values).
 *
 * Referential integrity:
 *   - Every insuredId value below must exist as a party reference in 002-parties.js.
 *   - Every createdByOrgCode must match an orgCode that exists in 002-parties.js.
 *   - Business rule coverage: seed data includes submissions in each lifecycle status to
 *     support UI and API test assertions.
 *
 * is_active: reflects whether the submission is operationally active.
 *   - true  → Open, Quoted, Bound, Issued, Active
 *   - false → Expired, Cancelled, Lapsed, Renewed, Closed, Disbanded
 *
 * Renewal links (set in post-INSERT step):
 *   - renewed_submission_id    → on expiring submission, points to the new renewal submission
 *   - renewed_from_submission_id → on new renewal submission, points back to expiring submission
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
//   Open      — SUB-2024-001, SUB-2024-005, SUB-2025-001, SUB-2025-003, SUB-2025-D01, SUB-2026-D01, SUB-2025-REN
//   Quoted    — SUB-2024-002, SUB-2025-002, SUB-2025-D02
//   Bound     — SUB-2024-003
//   Issued    — SUB-2024-007
//   Active    — SUB-2025-004
//   Expired   — SUB-2025-005
//   Cancelled — SUB-2025-006
//   Lapsed    — SUB-2025-007
//   Renewed   — SUB-2024-REN  (renewed_submission_id → SUB-2025-REN)
//   Closed    — SUB-2024-004
//   Disbanded — SUB-2024-006
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
        isActive: true,
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
        isActive: true,
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
        isActive: true,
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
        status: 'Closed',
        isActive: false,
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
        isActive: true,
        createdDate: '2024-04-18',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
    // Disbanded — submission was dissolved without progressing
    {
        reference: 'SUB-2024-006',
        submissionType: 'Submission',
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        placingBroker: 'Aon Risk Solutions',
        contractType: 'Policy Contract',
        inceptionDate: '2024-06-01',
        expiryDate: '2025-05-31',
        status: 'Disbanded',
        isActive: false,
        createdDate: '2024-05-01',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    // Issued — policy has been issued from this submission
    {
        reference: 'SUB-2024-007',
        submissionType: 'Submission',
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        placingBroker: 'Aon Risk Solutions',
        contractType: 'Policy Contract',
        inceptionDate: '2024-07-01',
        expiryDate: '2025-06-30',
        status: 'Issued',
        isActive: true,
        createdDate: '2024-06-01',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
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
        isActive: true,
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
        isActive: true,
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
        isActive: true,
        createdDate: '2025-02-15',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    // Active — linked policy is currently active (status will be maintained by events/jobs)
    {
        reference: 'SUB-2025-004',
        submissionType: 'Submission',
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Willis Towers Watson',
        contractType: 'Policy Contract',
        inceptionDate: '2025-04-01',
        expiryDate: '2026-03-31',
        status: 'Active',
        isActive: true,
        createdDate: '2025-03-01',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
    // Expired — linked policy expired
    {
        reference: 'SUB-2025-005',
        submissionType: 'Submission',
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        placingBroker: 'Best Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2024-05-01',
        expiryDate: '2025-04-30',
        status: 'Expired',
        isActive: false,
        createdDate: '2024-04-01',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    // Cancelled — linked policy was cancelled mid-term
    {
        reference: 'SUB-2025-006',
        submissionType: 'Submission',
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        placingBroker: 'Marsh Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2025-05-01',
        expiryDate: '2026-04-30',
        status: 'Cancelled',
        isActive: false,
        createdDate: '2025-04-01',
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
    },
    // Lapsed — linked policy lapsed (non-renewal / non-payment)
    {
        reference: 'SUB-2025-007',
        submissionType: 'Submission',
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2024-08-01',
        expiryDate: '2025-07-31',
        status: 'Lapsed',
        isActive: false,
        createdDate: '2024-07-01',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'SUB-2025-D01',
        submissionType: 'Submission',
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2025-06-01',
        expiryDate: '2026-05-31',
        status: 'Open',
        isActive: true,
        createdDate: '2025-05-20',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    {
        reference: 'SUB-2025-D02',
        submissionType: 'Submission',
        insured: 'Demo Logistics Ltd',
        insuredId: 'PTY-INS-D02',
        placingBroker: 'Demo Risk Partners',
        contractType: 'Policy Contract',
        inceptionDate: '2025-07-01',
        expiryDate: '2026-06-30',
        status: 'Quoted',
        isActive: true,
        createdDate: '2025-06-18',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    // Renewal pair — demonstrates bidirectional renewal link (set in post-INSERT step)
    // SUB-2024-REN is the expiring submission; SUB-2025-REN is the new renewal submission.
    {
        reference: 'SUB-2024-REN',
        submissionType: 'Submission',
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Willis Towers Watson',
        contractType: 'Policy Contract',
        inceptionDate: '2024-10-01',
        expiryDate: '2025-09-30',
        status: 'Renewed',
        isActive: false,
        createdDate: '2024-09-01',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
    {
        reference: 'SUB-2025-REN',
        submissionType: 'Submission',
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        placingBroker: 'Willis Towers Watson',
        contractType: 'Policy Contract',
        inceptionDate: '2025-10-01',
        expiryDate: '2026-09-30',
        status: 'Open',
        isActive: true,
        createdDate: '2025-09-01',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
    {
        reference: 'SUB-2026-D01',
        submissionType: 'Delegated Authority',
        insured: 'Demo Manufacturing Co',
        insuredId: 'PTY-INS-D01',
        placingBroker: 'Demo Brokers Ltd',
        contractType: 'Delegated Authority',
        inceptionDate: '2026-01-01',
        expiryDate: '2026-12-31',
        status: 'Open',
        isActive: true,
        createdDate: '2026-01-15',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
    },
    // Bind auto-decline demo (D1) — one submission with four sibling quotes
    // QUO-2025-D03 (Created) + QUO-2025-D04 (Quoted) should be auto-declined
    // when QUO-2025-D05 (Quoted) is bound.
    // QUO-2025-D06 (Declined) must NOT change — tests the exclusion guard.
    {
        reference: 'SUB-2025-D03',
        submissionType: 'Submission',
        insured: 'Demo Maritime Ltd',
        insuredId: null,
        placingBroker: 'Demo Brokers Ltd',
        contractType: 'Policy Contract',
        inceptionDate: '2025-08-01',
        expiryDate: '2026-07-31',
        status: 'Open',
        isActive: true,
        createdDate: '2025-07-01',
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
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
            const existing = await client.query(
                `SELECT id FROM submission WHERE reference = $1 LIMIT 1`,
                [s.reference]
            )
            if (existing.rowCount > 0) {
                console.log(`  ⊘ ${s.reference} — already exists (skipped)`)
                skipped++
                continue
            }
            const result = await client.query(
                `INSERT INTO submission
                   (reference, "submissionType", insured, "insuredId",
                    "placingBroker", "contractType",
                    "inceptionDate", "expiryDate",
                    status, is_active, "createdDate", "createdBy", "createdByOrgCode")
                 VALUES
                   ($1, $2, $3, $4,
                    $5, $6,
                    $7, $8,
                    $9, $10, $11, $12, $13)
                 RETURNING id, reference`,
                [
                    s.reference, s.submissionType, s.insured, s.insuredId,
                    s.placingBroker, s.contractType,
                    s.inceptionDate, s.expiryDate,
                    s.status, s.isActive ?? true, s.createdDate, s.createdBy, s.createdByOrgCode,
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

        // Set bidirectional renewal links (SUB-2024-REN ↔ SUB-2025-REN)
        await client.query(`
            UPDATE submission
            SET renewed_submission_id = (
                SELECT id FROM submission WHERE reference = 'SUB-2025-REN' LIMIT 1
            )
            WHERE reference = 'SUB-2024-REN'
              AND renewed_submission_id IS NULL
        `)
        await client.query(`
            UPDATE submission
            SET renewed_from_submission_id = (
                SELECT id FROM submission WHERE reference = 'SUB-2024-REN' LIMIT 1
            )
            WHERE reference = 'SUB-2025-REN'
              AND renewed_from_submission_id IS NULL
        `)
        console.log('[Seed 003 — submissions] Renewal links set.')

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

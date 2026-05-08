/**
 * Seed 026 — binding_authorities table
 *
 * THE ONLY seed script for the `binding_authorities` table.
 * To change test BA data, edit this file. Do NOT create a second BA seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT (reference) DO NOTHING.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 015, 064, 081 must have been run first.
 *   - Seed 003-submissions.js must have been run (BAs reference submission IDs).
 *
 * Status coverage (required — do not remove any status):
 *   Draft      — BA-2024-001
 *   Active     — BA-2024-002, BA-2025-001
 *   Expired    — BA-2023-001
 *   Declined   — BA-2024-003
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

// ---------------------------------------------------------------------------
// Test binding authority data
//
// Status coverage (required — do not remove any status):
//   Draft    — BA-2024-001
//   Active   — BA-2024-002, BA-2025-001, BA-2026-D01
//   Expired  — BA-2023-001
//   Declined — BA-2024-003
// ---------------------------------------------------------------------------

const BINDING_AUTHORITIES = [
    {
        reference: 'BA-2024-001',
        submissionRef: 'SUB-2024-001',   // links to Acme Corp Open submission
        status: 'Draft',
        inceptionDate: '2024-06-01',
        expiryDate: '2025-05-31',
        yearOfAccount: 2024,
        isMultiYear: false,
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
        coverholder: 'Global Coverholder Ltd',
        coverholderRef: 'PTY-CVH-001',
    },
    {
        reference: 'BA-2024-002',
        submissionRef: 'SUB-2024-002',   // links to Global Electronics Quoted submission
        status: 'Active',
        inceptionDate: '2024-04-01',
        expiryDate: '2025-03-31',
        yearOfAccount: 2024,
        isMultiYear: false,
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
        coverholder: 'Atlantic Underwriters',
        coverholderRef: 'PTY-CVH-002',
    },
    {
        reference: 'BA-2024-003',
        submissionRef: 'SUB-2024-004',   // links to Meridian Construction Declined submission
        status: 'Declined',
        inceptionDate: '2024-07-01',
        expiryDate: '2025-06-30',
        yearOfAccount: 2024,
        isMultiYear: false,
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
        coverholder: 'Pacific Risk Partners',
        coverholderRef: 'PTY-CVH-003',
    },
    {
        reference: 'BA-2023-001',
        submissionRef: null,             // standalone — no submission link
        status: 'Expired',
        inceptionDate: '2023-01-01',
        expiryDate: '2023-12-31',
        yearOfAccount: 2023,
        isMultiYear: false,
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
        coverholder: 'Global Coverholder Ltd',
        coverholderRef: 'PTY-CVH-001',
    },
    {
        reference: 'BA-2025-001',
        submissionRef: 'SUB-2025-001',   // links to an Open 2025 submission
        status: 'Active',
        inceptionDate: '2025-01-01',
        expiryDate: '2025-12-31',
        yearOfAccount: 2025,
        isMultiYear: false,
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
        coverholder: 'Atlantic Underwriters',
        coverholderRef: 'PTY-CVH-002',
    },
    {
        reference: 'BA-2026-D01',
        submissionRef: 'SUB-2026-D01',
        status: 'Active',
        inceptionDate: '2026-01-01',
        expiryDate: '2026-12-31',
        yearOfAccount: 2026,
        isMultiYear: false,
        createdBy: 'admin',
        createdByOrgCode: 'DEMO',
        coverholder: 'Global Coverholder Ltd',
        coverholderRef: 'PTY-CVH-001',
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-026] Not running — environment is not development.')
        process.exit(0)
    }

    const client = await pool.connect()
    try {
        console.log('[Seed 026 — binding_authorities] Inserting test binding authorities...')
        let inserted = 0
        let skipped = 0

        for (const ba of BINDING_AUTHORITIES) {
            // Look up submission_id by reference if a submissionRef is provided
            let submissionId = null
            if (ba.submissionRef) {
                const subRes = await client.query(
                    `SELECT id FROM submission WHERE reference = $1 LIMIT 1`,
                    [ba.submissionRef]
                )
                if (subRes.rows.length > 0) {
                    submissionId = subRes.rows[0].id
                } else {
                    console.log(`  ⚠ ${ba.reference} — submission ${ba.submissionRef} not found, inserting without submission_id`)
                }
            }

            // Check if already exists
            const existing = await client.query(
                `SELECT id FROM binding_authorities WHERE reference = $1`,
                [ba.reference]
            )
            if (existing.rows.length > 0) {
                console.log(`  ⊘ ${ba.reference} — already exists (skipped)`)
                skipped++
                continue
            }

            const payload = JSON.stringify({
                coverholder: ba.coverholder,
                coverholder_id: ba.coverholderRef,
            })

            await client.query(
                `INSERT INTO binding_authorities (
                    reference, submission_id, status,
                    inception_date, expiry_date,
                    year_of_account, is_multi_year,
                    payload,
                    created_by, created_by_org_code
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
                [
                    ba.reference, submissionId, ba.status,
                    ba.inceptionDate, ba.expiryDate,
                    ba.yearOfAccount, ba.isMultiYear,
                    payload,
                    ba.createdBy, ba.createdByOrgCode,
                ]
            )
            console.log(`  ✅ ${ba.reference} (${ba.status}) — inserted`)
            inserted++
        }

        console.log(`[Seed 026 — binding_authorities] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 026 — binding_authorities] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

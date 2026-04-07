/**
 * Seed 024 — quotes table
 *
 * THE ONLY seed script for the `quotes` table.
 * To change test quote data, edit this file. Do NOT create a second quotes seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT DO NOTHING.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 001–008, 084, 093 must have been run first.
 *   - Seed 003-submissions.js must have been run (quotes reference submission IDs).
 *
 * Referential integrity:
 *   - Every submission_id value below must exist in 003-submissions.js seed data.
 *   - Status coverage: Draft, Quoted, Bound, Declined.
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// Test quote data
//
// Status coverage (required — do not remove any status):
//   Draft     — QUO-2024-001, QUO-2025-001
//   Quoted    — QUO-2024-002
//   Bound     — QUO-2024-003
//   Declined  — QUO-2024-004
// ---------------------------------------------------------------------------

const QUOTES = [
    {
        reference: 'QUO-2024-001',
        insured: 'Acme Corp',
        insuredId: 'PTY-INS-001',
        status: 'Draft',
        businessType: 'Insurance',
        inceptionDate: '2024-01-15',
        expiryDate: '2025-01-14',
        quoteCurrency: 'USD',
        contractType: 'Policy Contract',
        createdBy: 'broker.sam',
        createdByOrgCode: 'BBRK',
    },
    {
        reference: 'QUO-2024-002',
        insured: 'Global Electronics Ltd',
        insuredId: 'PTY-INS-002',
        status: 'Quoted',
        businessType: 'Insurance',
        inceptionDate: '2024-02-01',
        expiryDate: '2025-01-31',
        quoteCurrency: 'USD',
        contractType: 'Policy Contract',
        createdBy: 'broker.jane',
        createdByOrgCode: 'MRSH',
    },
    {
        reference: 'QUO-2024-003',
        insured: 'Coastal Shipping PLC',
        insuredId: 'PTY-INS-003',
        status: 'Bound',
        businessType: 'Marine',
        inceptionDate: '2024-03-01',
        expiryDate: '2025-02-28',
        quoteCurrency: 'GBP',
        contractType: 'Policy Contract',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    {
        reference: 'QUO-2024-004',
        insured: 'Meridian Construction Group',
        insuredId: 'PTY-INS-004',
        status: 'Declined',
        businessType: 'Liability',
        inceptionDate: '2024-04-01',
        expiryDate: '2025-03-31',
        quoteCurrency: 'USD',
        contractType: 'Policy Contract',
        createdBy: 'broker.david',
        createdByOrgCode: 'AON',
    },
    {
        reference: 'QUO-2025-001',
        insured: 'Skyline Hospitality Group',
        insuredId: 'PTY-INS-005',
        status: 'Draft',
        businessType: 'Property',
        inceptionDate: '2025-05-01',
        expiryDate: '2026-04-30',
        quoteCurrency: 'EUR',
        contractType: 'Policy Contract',
        createdBy: 'broker.emma',
        createdByOrgCode: 'WTW',
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-024] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 024 — quotes] Inserting test quotes...')
        let inserted = 0
        let skipped = 0

        for (const q of QUOTES) {
            // Look up submission_id by matching insuredId and status progression
            let submissionId = null
            const subRes = await client.query(
                `SELECT id FROM submission WHERE "insuredId" = $1 LIMIT 1`,
                [q.insuredId]
            )
            if (subRes.rows.length > 0) submissionId = subRes.rows[0].id

            const existing = await client.query(
                `SELECT id FROM quotes WHERE reference = $1`,
                [q.reference]
            )
            if (existing.rows.length > 0) {
                console.log(`  ⊘ ${q.reference} — already exists (skipped)`)
                skipped++
                continue
            }

            await client.query(
                `INSERT INTO quotes (
                    reference, submission_id, insured, insured_id, status,
                    business_type, inception_date, expiry_date,
                    quote_currency, contract_type,
                    created_by, created_by_org_code
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    q.reference, submissionId, q.insured, q.insuredId, q.status,
                    q.businessType, q.inceptionDate, q.expiryDate,
                    q.quoteCurrency, q.contractType,
                    q.createdBy, q.createdByOrgCode,
                ]
            )
            console.log(`  ✅ ${q.reference} (${q.status}) — inserted`)
            inserted++
        }

        console.log(`[Seed 024 — quotes] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 024 — quotes] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

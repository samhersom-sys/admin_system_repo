/**
 * Seed 002 — party table
 *
 * THE ONLY seed script for the `party` table.
 * To change test party data, edit this file. Do NOT create a second parties seed.
 *
 * Safe to run multiple times — all INSERTs use ON CONFLICT (reference) DO NOTHING.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migrations 001–004 must have been run first.
 *   - No foreign key dependencies on other seed tables (parties are referenced BY submissions).
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// Test party data — brokers, insureds, insurers, coverholders
//
// Data completeness rules (see Guideline 15):
//   - Every role type used by submission seed data must have at least one party.
//   - Every orgCode referenced in submission seed data must appear here.
//   - References follow pattern: PTY-{ROLE_CODE}-{NNN}
// ---------------------------------------------------------------------------

const PARTIES = [
    // --- Brokers ---
    {
        reference: 'PTY-BRK-001', name: 'Marsh Ltd', role: 'Broker',
        email: 'submissions@marsh.com', phone: '+44 20 7357 1000',
        addressLine1: '1 Tower Place West', city: 'London', postcode: 'EC3R 5BU',
        country: 'United Kingdom', orgCode: 'MRSH', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-BRK-002', name: 'Aon Risk Solutions', role: 'Broker',
        email: 'london@aon.com', phone: '+44 20 7623 5500',
        addressLine1: 'The Aon Centre', addressLine2: 'The Leadenhall Building',
        addressLine3: '122 Leadenhall Street', city: 'London', postcode: 'EC3V 4AN',
        country: 'United Kingdom', orgCode: 'AON', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-BRK-003', name: 'Willis Towers Watson', role: 'Broker',
        email: 'london@wtwco.com', phone: '+44 20 3124 6000',
        addressLine1: '51 Lime Street', city: 'London', postcode: 'EC3M 7DQ',
        country: 'United Kingdom', orgCode: 'WTW', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-BRK-004', name: 'Best Brokers Ltd', role: 'Broker',
        email: 'broker@bestbrokers.com', phone: '+44 20 7946 0400',
        addressLine1: '10 Fenchurch Avenue', city: 'London', postcode: 'EC3M 5BN',
        country: 'United Kingdom', orgCode: 'BBRK', createdBy: 'admin@policyforge.com',
    },

    // --- Insureds ---
    {
        reference: 'PTY-INS-001', name: 'Acme Corp', role: 'Insured',
        email: 'insurance@acmecorp.com', phone: '+1 212 555 0100',
        addressLine1: '350 Fifth Avenue', city: 'New York', state: 'NY', postcode: '10118',
        country: 'United States', orgCode: 'BBRK', createdBy: 'admin@policyforge.com',
        annualRevenue: 45000000, numberEmployees: 320, sicCode: '5065',
        sicDescription: 'Electronic Parts and Equipment', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-INS-002', name: 'Global Electronics Ltd', role: 'Insured',
        email: 'risk@globalelectronics.co.uk', phone: '+44 1234 567890',
        addressLine1: '100 Techpark Way', city: 'Reading', postcode: 'RG1 1AA',
        country: 'United Kingdom', orgCode: 'BBRK', createdBy: 'admin@policyforge.com',
        annualRevenue: 120000000, numberEmployees: 850, wageRoll: 35000000,
        sicCode: '3679', sicDescription: 'Electronic Components, NEC', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-INS-003', name: 'Coastal Shipping PLC', role: 'Insured',
        email: 'marine.risk@coastalshipping.com', phone: '+44 20 7900 3300',
        addressLine1: '12 Canary Wharf', city: 'London', postcode: 'E14 5AB',
        country: 'United Kingdom', orgCode: 'MRSH', createdBy: 'admin@policyforge.com',
        annualRevenue: 280000000, numberEmployees: 1200, wageRoll: 62000000,
        sicCode: '4412', sicDescription: 'Deep Sea Foreign Transportation of Freight', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-INS-004', name: 'Meridian Construction Group', role: 'Insured',
        email: 'insurance@meridiancg.com', phone: '+1 312 555 0200',
        addressLine1: '233 South Wacker Drive', city: 'Chicago', state: 'IL', postcode: '60606',
        country: 'United States', orgCode: 'AON', createdBy: 'admin@policyforge.com',
        annualRevenue: 95000000, numberEmployees: 650,
        sicCode: '1731', sicDescription: 'Electrical Work', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-INS-005', name: 'Skyline Hospitality Group', role: 'Insured',
        email: 'risk@skylinehospitality.com', phone: '+44 161 999 1234',
        addressLine1: '8 Spinningfields Square', city: 'Manchester', postcode: 'M3 3JE',
        country: 'United Kingdom', orgCode: 'WTW', createdBy: 'admin@policyforge.com',
        annualRevenue: 55000000, numberEmployees: 2400, wageRoll: 28000000,
        sicCode: '7011', sicDescription: 'Hotels and Motels', sicStandard: 'US SIC',
    },

    // --- Insurers ---
    {
        reference: 'PTY-URW-001', name: 'Arch Insurance', role: 'Insurer',
        email: 'london@archgroup.com', phone: '+44 20 7337 5000',
        addressLine1: '60 Great Tower Street', city: 'London', postcode: 'EC3R 5AZ',
        country: 'United Kingdom', orgCode: 'ADMIN', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-URW-002', name: 'Beazley PLC', role: 'Insurer',
        email: 'underwriting@beazley.com', phone: '+44 20 7667 0623',
        addressLine1: 'Plantation Place South', addressLine2: '60 Great Tower Street',
        city: 'London', postcode: 'EC3R 5AD', country: 'United Kingdom',
        orgCode: 'ADMIN', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-URW-003', name: 'Hiscox Insurance', role: 'Insurer',
        email: 'london@hiscox.com', phone: '+44 20 7448 6000',
        addressLine1: '1 Great St Helens', city: 'London', postcode: 'EC3A 6HX',
        country: 'United Kingdom', orgCode: 'ADMIN', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-URW-004', name: 'Chubb Insurance', role: 'Insurer',
        email: 'london@chubb.com', phone: '+44 20 7739 4600',
        addressLine1: '100 Leadenhall Street', city: 'London', postcode: 'EC3A 3BP',
        country: 'United Kingdom', orgCode: 'ADMIN', createdBy: 'admin@policyforge.com',
    },

    // --- Coverholders ---
    {
        reference: 'PTY-CVH-001', name: 'Global Coverholder Ltd', role: 'Coverholder',
        email: 'coverholder@globalcover.com', phone: '+44 20 3456 7890',
        addressLine1: '24 Cornhill', city: 'London', postcode: 'EC3V 3ND',
        country: 'United Kingdom', orgCode: 'BBRK', createdBy: 'admin@policyforge.com',
    },

    // --- DEMO org parties (for admin@policyforge.com — orgCode DEMO) ---
    {
        reference: 'PTY-INS-D01', name: 'Demo Manufacturing Co', role: 'Insured',
        email: 'risk@demomfg.com', phone: '+44 20 7946 0100',
        addressLine1: '1 Demo Park', city: 'London', postcode: 'EC1A 1BB',
        country: 'United Kingdom', orgCode: 'DEMO', createdBy: 'admin@policyforge.com',
        annualRevenue: 25000000, numberEmployees: 180,
        sicCode: '3490', sicDescription: 'Metal Services, NEC', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-INS-D02', name: 'Demo Logistics Ltd', role: 'Insured',
        email: 'insurance@demologistics.co.uk', phone: '+44 20 7946 0200',
        addressLine1: '14 Freight Lane', city: 'Birmingham', postcode: 'B1 1AA',
        country: 'United Kingdom', orgCode: 'DEMO', createdBy: 'admin@policyforge.com',
        annualRevenue: 62000000, numberEmployees: 450, wageRoll: 18000000,
        sicCode: '4213', sicDescription: 'Trucking, Except Local', sicStandard: 'US SIC',
    },
    {
        reference: 'PTY-BRK-D01', name: 'Demo Brokers Ltd', role: 'Broker',
        email: 'submissions@demobrokers.com', phone: '+44 20 7946 0300',
        addressLine1: '5 Broker Street', city: 'London', postcode: 'EC3A 5DE',
        country: 'United Kingdom', orgCode: 'DEMO', createdBy: 'admin@policyforge.com',
    },
    {
        reference: 'PTY-BRK-D02', name: 'Demo Risk Partners', role: 'Broker',
        email: 'london@demorisk.com', phone: '+44 20 7946 0400',
        addressLine1: '22 Cornhill', city: 'London', postcode: 'EC3V 3NL',
        country: 'United Kingdom', orgCode: 'DEMO', createdBy: 'admin@policyforge.com',
    },
]

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-002] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 002 — parties] Inserting test parties...')
        let inserted = 0
        let skipped = 0

        // Ensure reference uniqueness constraint exists so ON CONFLICT works
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_party_reference
                ON party (reference)
            WHERE reference IS NOT NULL
        `)

        for (const p of PARTIES) {
            const result = await client.query(
                `INSERT INTO party
                   (reference, name, role, email, phone,
                    "addressLine1", "addressLine2", "addressLine3",
                    city, state, postcode, country, region,
                    "orgCode", "createdBy", "createdDate",
                    "annualRevenue", "numberEmployees", "wageRoll",
                    "sicStandard", "sicCode", "sicDescription")
                 VALUES
                   ($1, $2, $3, $4, $5,
                    $6, $7, $8,
                    $9, $10, $11, $12, $13,
                    $14, $15, CURRENT_DATE,
                    $16, $17, $18,
                    $19, $20, $21)
                 ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING
                 RETURNING id, name`,
                [
                    p.reference, p.name, p.role, p.email ?? null, p.phone ?? null,
                    p.addressLine1 ?? null, p.addressLine2 ?? null, p.addressLine3 ?? null,
                    p.city ?? null, p.state ?? null, p.postcode ?? null, p.country ?? null, p.region ?? null,
                    p.orgCode ?? null, p.createdBy ?? null,
                    p.annualRevenue ?? null, p.numberEmployees ?? null, p.wageRoll ?? null,
                    p.sicStandard ?? null, p.sicCode ?? null, p.sicDescription ?? null,
                ]
            )
            if (result.rowCount > 0) {
                console.log(`  ✅ ${p.name} (${p.role}) — inserted (id: ${result.rows[0].id})`)
                inserted++
            } else {
                console.log(`  ⊘ ${p.name} — already exists (skipped)`)
                skipped++
            }
        }

        console.log(`[Seed 002 — parties] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 002 — parties] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

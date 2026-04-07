/**
 * Seed 001 — users table
 *
 * THE ONLY seed script for the `users` table.
 * To change test user data, edit this file. Do NOT create a second users seed.
 *
 * Safe to run multiple times — users are checked by email before insert.
 * Run: npm run db:seed  (invoked automatically as part of db:setup)
 *
 * Prerequisites:
 *   - Migration 001-create-users-table.js must have been run first.
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const bcryptjs = require('bcryptjs')
const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// Test accounts — one entry per logical user
// Passwords are hashed at runtime; never store plaintext passwords in the DB.
// ---------------------------------------------------------------------------

const CORE_USERS = [
    {
        username: 'admin',
        email: 'admin@policyforge.com',
        password: 'Admin123!',
        fullName: 'Policy Forge Admin',
        orgCode: 'DEMO',
        role: 'internal_admin',
    },
    {
        username: 'company_admin',
        email: 'admin@company.com',
        password: 'Company123!',
        fullName: 'Company Admin',
        orgCode: 'DEMO',
        role: 'client_admin',
    },
    {
        username: 'testauth',
        email: 'testauth@example.com',
        password: 'TestPass123!',
        fullName: 'Test Auth User',
        orgCode: 'TESTORG',
        role: 'user',
    },
]

// ---------------------------------------------------------------------------
// UAT accounts — added 2026-04-07
// MUST NOT be seeded into production. Only included when SEED_INCLUDE_UAT=true.
// ---------------------------------------------------------------------------
const UAT_USERS = [
    {
        username: 'uat_sw3k7m',
        email: 'Stephen.Williams3046@yahoo.co.uk',
        password: 'UatSw9@kMx3!',
        fullName: 'Stephen Williams',
        orgCode: 'DEMO',
        role: 'client_admin',
    },
    {
        username: 'uat_rd8p2x',
        email: 'Rdarke01@gmail.com',
        password: 'UatRd4#nQv7!',
        fullName: 'R Darke',
        orgCode: 'DEMO',
        role: 'client_admin',
    },
    {
        username: 'uat_at5n9q',
        email: 'Anthony.Tage86@outlook.com',
        password: 'UatAt6$mKj2!',
        fullName: 'Anthony Tage',
        orgCode: 'DEMO',
        role: 'client_admin',
    },
]

// Combine: UAT users only included when SEED_INCLUDE_UAT=true
const USERS = process.env.SEED_INCLUDE_UAT === 'true'
    ? [...CORE_USERS, ...UAT_USERS]
    : CORE_USERS

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-001] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        console.log('[Seed 001 — users] Inserting test users...')
        let inserted = 0
        let skipped = 0

        for (const u of USERS) {
            const existing = await client.query(
                `SELECT id FROM users WHERE email = $1`, [u.email]
            )
            if (existing.rows.length > 0) {
                console.log(`  ⊘ ${u.email} — already exists (skipped)`)
                skipped++
                continue
            }
            const hash = await bcryptjs.hash(u.password, 10)
            await client.query(
                `INSERT INTO users (username, email, password_hash, full_name, org_code, role)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [u.username, u.email, hash, u.fullName, u.orgCode, u.role]
            )
            console.log(`  ✅ ${u.email} (${u.role}) — inserted`)
            inserted++
        }

        console.log(`[Seed 001 — users] Done. ${inserted} inserted, ${skipped} skipped.`)
    } catch (err) {
        console.error('[Seed 001 — users] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()

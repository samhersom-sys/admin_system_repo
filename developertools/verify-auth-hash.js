'use strict'
require('dotenv').config({ path: '.env.local' })
const bcryptjs = require('bcryptjs')
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const result = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', ['testauth@example.com'])
    if (!result.rows.length) { console.log('USER NOT FOUND'); return pool.end() }
    const { email, password_hash } = result.rows[0]
    console.log('Hash from DB:', password_hash.substring(0, 20) + '...')
    const match = await bcryptjs.compare('TestPass123!', password_hash)
    console.log('bcrypt.compare("TestPass123!", storedHash) =', match)
    await pool.end()
}
run().catch(e => { console.error(e.message); pool.end() })

'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
})

async function run() {
    const client = await pool.connect()
    try {
        // Delete test-created records (from integration test runs)
        let r = await client.query("DELETE FROM quotes WHERE reference LIKE 'QUO-DEMO-%'")
        console.log('Deleted test quotes:', r.rowCount)
        r = await client.query("DELETE FROM policies WHERE reference LIKE 'POL-DEMO-%'")
        console.log('Deleted test policies:', r.rowCount)
        r = await client.query("DELETE FROM submission WHERE reference LIKE 'SUB-DEMO-%'")
        console.log('Deleted test submissions (DEMO):', r.rowCount)
        r = await client.query("DELETE FROM submission WHERE reference LIKE 'SUB-OTHER-%'")
        console.log('Deleted test submissions (OTHER):', r.rowCount)

        // Remove duplicated seed submissions (keep lowest id per reference)
        r = await client.query(`
            DELETE FROM submission
            WHERE id NOT IN (
                SELECT MIN(id) FROM submission GROUP BY reference
            )
        `)
        console.log('Deleted duplicate submissions:', r.rowCount)

        // Also remove D01/D02 seed submissions that might be missing
        // (they were in original seeds but deleted by SUB-DEMO cleanup)

        // Verify remaining counts
        r = await client.query('SELECT COUNT(*) FROM quotes')
        console.log('Remaining quotes:', r.rows[0].count)
        r = await client.query('SELECT COUNT(*) FROM policies')
        console.log('Remaining policies:', r.rows[0].count)
        r = await client.query('SELECT COUNT(*) FROM submission')
        console.log('Remaining submissions:', r.rows[0].count)
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('ERROR:', err.message); process.exit(1) })

'use strict'
/**
 * Migration 111 — normalise audit_event entity_type for binding authorities.
 *
 * Changes entity_type from 'BindingAuthority' (no space) to 'Binding Authority'
 * (with space) across all existing rows. Also updates action text that embedded
 * the entity type (e.g. 'BindingAuthority Opened' → 'Binding Authority Opened').
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
})

async function run() {
    const client = await pool.connect()
    try {
        await client.query(`BEGIN`)

        // Update entity_type
        const r1 = await client.query(
            `UPDATE audit_event SET entity_type = 'Binding Authority' WHERE entity_type = 'BindingAuthority'`
        )
        console.log(`[111] Updated ${r1.rowCount} audit_event entity_type rows.`)

        // Update action text
        const r2 = await client.query(
            `UPDATE audit_event SET action = REPLACE(action, 'BindingAuthority', 'Binding Authority') WHERE action LIKE '%BindingAuthority%'`
        )
        console.log(`[111] Updated ${r2.rowCount} audit_event action rows.`)

        await client.query(`COMMIT`)
        console.log('[111] Done — audit_event BindingAuthority → Binding Authority.')
    } catch (err) {
        await client.query(`ROLLBACK`)
        throw err
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => {
    console.error('[111] ERROR:', err.message)
    process.exit(1)
})

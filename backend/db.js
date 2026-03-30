/**
 * Database pool — Postgres (pg)
 *
 * Every backend route uses this module for DB access.
 * Direct `new Pool()` calls elsewhere are forbidden.
 *
 * DATABASE_URL: postgres://policyforge:changeme@127.0.0.1:5432/policyforge_dev
 */

'use strict'

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({
    connectionString: DB_URL,
    connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error', err.message)
})

/**
 * Run a SELECT query and return all rows.
 * @param {string} sql - Parameterised SQL using $1, $2, ... placeholders
 * @param {unknown[]} [params] - Positional parameters
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function runQuery(sql, params = []) {
    const client = await pool.connect()
    try {
        const result = await client.query(sql, params)
        return result.rows
    } finally {
        client.release()
    }
}

/**
 * Run an INSERT, UPDATE, or DELETE and return all affected rows.
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function runCommand(sql, params = []) {
    const client = await pool.connect()
    try {
        const result = await client.query(sql, params)
        return result.rows
    } finally {
        client.release()
    }
}

async function closePool() {
    await pool.end()
}

module.exports = { pool, runQuery, runCommand, closePool }

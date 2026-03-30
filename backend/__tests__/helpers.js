/**
 * Backend test helpers — Cleaned project
 *
 * These helpers are used by all backend integration tests.
 * They connect to the same Postgres database used by the running backend.
 *
 * NOTE: The active backend server is currently in the BackUp folder.
 * These helpers point at the BackUp server until Cleaned has its own server.
 * When Cleaned has its own backend, update the require paths below.
 *
 * DATABASE: postgres://policyforge:changeme@127.0.0.1:5432/policyforge_dev
 * Backend must be running before these tests execute.
 */

const supertest = require('supertest')
const { Pool } = require('pg')

// ---------------------------------------------------------------------------
// Database connection (direct — for schema validation queries)
// ---------------------------------------------------------------------------

const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

let _pool = null
function getPool() {
    if (!_pool) _pool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 5000 })
    return _pool
}

async function runQuery(sql, params = []) {
    const pool = getPool()
    const result = await pool.query(sql, params)
    return result.rows
}

async function closePool() {
    if (_pool) { await _pool.end(); _pool = null }
}

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the table exists in the public schema.
 */
async function tableExists(tableName) {
    const rows = await runQuery(
        `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    )
    return rows.length > 0
}

/**
 * Returns an array of column names for the given table.
 */
async function getTableColumns(tableName) {
    const rows = await runQuery(
        `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
        [tableName]
    )
    return rows.map(r => r.column_name)
}

/**
 * Returns true if the exact column exists on the table.
 */
async function columnExists(tableName, columnName) {
    const rows = await runQuery(
        `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    )
    return rows.length > 0
}

// ---------------------------------------------------------------------------
// HTTP helpers (requires backend to be running separately on port 5000)
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000'
const agent = supertest(BASE_URL)

/**
 * Get a valid JWT token by logging in as the dev admin user.
 * Requires the backend to be running and the admin user to be seeded.
 */
async function getAuthToken(email = 'admin@policyforge.com', password = 'Admin123!') {
    const res = await agent
        .post('/api/auth/login')
        .send({ email, password })
    if (res.status !== 200 || !res.body.token) {
        throw new Error(`Auth failed: ${res.status} ${JSON.stringify(res.body)}`)
    }
    return res.body.token
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    agent,
    runQuery,
    closePool,
    tableExists,
    getTableColumns,
    columnExists,
    getAuthToken,
}

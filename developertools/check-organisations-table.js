'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // Check if organisations table exists and its columns
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%org%'")
  console.log('Org-related tables:', tables.rows.map(r => r.table_name))

  // Check what columns the organisations table has
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='organisations' ORDER BY ordinal_position")
  console.log('organisations columns:', JSON.stringify(cols.rows, null, 2))

  pool.end()
}
main().catch(e => { console.error(e.message); pool.end() })

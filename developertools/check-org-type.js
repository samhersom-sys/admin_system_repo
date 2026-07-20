'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query("SELECT org_code, org_type, name FROM organisations WHERE org_code = 'DEMO' LIMIT 5")
  .then(r => { console.log('DEMO org:', JSON.stringify(r.rows, null, 2)); return pool.query("SELECT org_code, org_type FROM organisations LIMIT 20") })
  .then(r => { console.log('All orgs:', JSON.stringify(r.rows, null, 2)); pool.end() })
  .catch(e => { console.error(e.message); pool.end() })

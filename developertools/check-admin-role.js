'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query("SELECT email, role, org_code FROM users WHERE email ILIKE '%admin%' ORDER BY id LIMIT 10")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end() })
  .catch(e => { console.error(e.message); pool.end() })

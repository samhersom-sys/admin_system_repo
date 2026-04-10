'use strict'
const { Pool } = require('pg')
const p = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})
p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    .then(r => { r.rows.forEach(x => console.log(x.tablename)); p.end() })
    .catch(e => { console.error(e.message); p.end() })

const { Pool } = require('pg')
const p = new Pool({ connectionString: 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned', connectionTimeoutMillis: 5000 })
Promise.all(['submission','quotes','party','users','audit_event'].map(t =>
    p.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', ['public', t])
     .then(r => ({ table: t, cols: r.rows.map(x => x.column_name) }))
)).then(results => {
    results.forEach(r => console.log(r.table + ': ' + r.cols.join(', ')))
    return p.end()
}).catch(e => { console.error(e.message); process.exit(1) })

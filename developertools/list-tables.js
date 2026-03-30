const { Pool } = require('pg')
const p = new Pool({ connectionString: 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned', connectionTimeoutMillis: 5000 })
p.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']).then(r => {
    const names = r.rows.map(x => x.table_name).sort()
    console.log(names.join('\n'))
    return p.end()
}).catch(e => { console.error(e.message); process.exit(1) })

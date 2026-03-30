const { Pool } = require('pg')
const p = new Pool({ connectionString: 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
p.query(`
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema='public' 
    AND table_name IN ('submission', 'quotes')
  ORDER BY table_name, ordinal_position
`)
.then(r => { r.rows.forEach(x => console.log(x.table_name.padEnd(12), x.column_name.padEnd(30), x.data_type)); })
.finally(() => p.end())

const { Pool } = require('pg')
const p = new Pool({ connectionString: 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
p.query(`
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema='public' 
    AND table_name IN ('party','submission','quotes')
    AND column_name IN ('id','insuredId','insured_id','orgCode','party_created_id')
  ORDER BY table_name, column_name
`)
.then(r => { r.rows.forEach(x => console.log(x.table_name, x.column_name, x.data_type)); })
.finally(() => p.end())

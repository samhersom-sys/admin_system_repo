const { Pool } = require('pg')
const p = new Pool({ connectionString: 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
  .then(r => {
    console.log('TABLES:')
    r.rows.forEach(x => console.log(' -', x.tablename))
    return p.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='submission'
      ORDER BY ordinal_position
    `)
  })
  .then(r => {
    console.log('\nsubmission columns:')
    r.rows.forEach(x => console.log(' -', x.column_name))
    return p.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='quotes'
      ORDER BY ordinal_position
    `)
  })
  .then(r => {
    console.log('\nquotes columns:')
    r.rows.forEach(x => console.log(' -', x.column_name))
  })
  .finally(() => p.end())

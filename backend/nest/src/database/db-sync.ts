/**
 * db-sync.ts — Fresh-install database synchronisation script.
 *
 * Uses TypeORM DataSource.synchronize() to create all tables, indexes, and
 * constraints from the registered @Entity() classes in one pass.
 *
 * USE CASES:
 *   - First-time developer setup (replaces the old `db:migrate` raw-SQL approach)
 *   - CI environment spin-up against a blank database
 *
 * DO NOT USE against a production database — synchronize() is destructive if
 * the schema has drifted. Production changes use explicit TypeORM migrations.
 *
 * Usage:
 *   npx ts-node backend/nest/src/database/db-sync.ts
 *   (or via the root package.json "db:sync" script)
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'

// Load .env.local from workspace root (4 levels up: database/ → src/ → nest/ → backend/ → root)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })

import { typeOrmOptions } from '../config/typeorm.config'

async function main(): Promise<void> {
  const ds = new DataSource({
    ...typeOrmOptions,
    synchronize: false,   // we call synchronize() explicitly below
    migrationsRun: false, // no migrations during sync
    logging: ['query', 'error', 'schema'],
  })

  await ds.initialize()
  console.log('[db-sync] DataSource initialised. Running synchronize()...')

  await ds.synchronize()
  console.log('[db-sync] Schema synchronisation complete.')

  await ds.destroy()
  console.log('[db-sync] Done.')
}

main().catch(err => {
  console.error('[db-sync] ERROR:', err.message)
  process.exit(1)
})

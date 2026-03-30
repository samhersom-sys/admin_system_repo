import { DataSource, DataSourceOptions } from 'typeorm'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { User } from '../entities/user.entity'
import { Party } from '../entities/party.entity'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { Policy } from '../entities/policy.entity'

// Resolve .env.local from workspace root (4 levels up from backend/nest/src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',

  // Phase 2 entities — add new Entity classes here as they are created
  entities: [User, Party, Submission, Quote, QuoteSection, Policy],

  // TypeORM-managed migrations live in src/migrations/
  // {.ts,.js} handles both ts-node (CLI/dev) and compiled dist (production)
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],

  // NEVER synchronize in any environment — always use explicit migrations
  synchronize: false,

  // Run migrations automatically on startup once the baseline is established
  migrationsRun: false,

  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  migrationsTableName: 'typeorm_migrations',
}

/**
 * DataSource used by the TypeORM CLI (typeorm migration:generate / migration:run).
 * Export MUST be the default or named 'AppDataSource' for the CLI to find it.
 */
export const AppDataSource = new DataSource(typeOrmOptions)

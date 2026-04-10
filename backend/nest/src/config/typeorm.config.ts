import { DataSource, DataSourceOptions } from 'typeorm'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { User } from '../entities/user.entity'
import { Party } from '../entities/party.entity'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { Policy } from '../entities/policy.entity'
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'
import { FinanceCashBatch } from '../entities/finance-cash-batch.entity'
import { FinanceInvoice } from '../entities/finance-invoice.entity'
import { FinancePayment } from '../entities/finance-payment.entity'
import { ClearanceSubmission } from '../entities/clearance-submission.entity'
import { DataQualityIssue } from '../entities/data-quality-issue.entity'
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'

// Resolve .env.local from workspace root (4 levels up from backend/nest/src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })

const shouldUseDatabaseSsl = process.env.DATABASE_SSL === 'true'

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',

  // Phase 2 entities — add new Entity classes here as they are created
  entities: [
    User, Party, Submission, Quote, QuoteSection, Policy,
    ReportTemplate, ReportExecutionHistory,
    FinanceCashBatch, FinanceInvoice, FinancePayment,
    ClearanceSubmission, DataQualityIssue,
    BindingAuthority, BASection, BATransaction, BASectionParticipation, BASectionAuthorizedRisk,
  ],

  // TypeORM-managed migrations live in src/migrations/
  // {.ts,.js} handles both ts-node (CLI/dev) and compiled dist (production)
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],

  // NEVER synchronize in any environment — always use explicit migrations
  synchronize: false,

  // Run pending migrations automatically on server startup
  // Migrations use CREATE TABLE IF NOT EXISTS so re-runs are safe
  migrationsRun: true,

  ssl: shouldUseDatabaseSsl ? { rejectUnauthorized: false } : false,

  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  migrationsTableName: 'typeorm_migrations',
}

/**
 * DataSource used by the TypeORM CLI (typeorm migration:generate / migration:run).
 * Export MUST be the default or named 'AppDataSource' for the CLI to find it.
 */
export const AppDataSource = new DataSource(typeOrmOptions)

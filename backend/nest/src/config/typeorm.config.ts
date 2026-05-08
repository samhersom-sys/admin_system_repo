import { DataSource, DataSourceOptions } from 'typeorm'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Core entities
import { User } from '../entities/user.entity'
import { Party } from '../entities/party.entity'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { Policy } from '../entities/policy.entity'
import { PolicySection } from '../entities/policy-section.entity'
import { PolicyTransaction } from '../entities/policy-transaction.entity'
import { PolicySectionCoverage, QuoteSectionCoverage } from '../entities/policy-section-coverage.entity'

// Reporting and finance
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'
import { FinanceCashBatch } from '../entities/finance-cash-batch.entity'
import { FinanceInvoice } from '../entities/finance-invoice.entity'
import { FinancePayment } from '../entities/finance-payment.entity'
import { PolicySectionTransaction, BASectionTransaction } from '../entities/financial-section-transaction.entity'

// Workflow, clearance, data quality
import { ClearanceSubmission } from '../entities/clearance-submission.entity'
import { DataQualityIssue } from '../entities/data-quality-issue.entity'
import { ClearanceQueue, OrganisationHierarchy, OrganisationEntity, OrganisationHierarchyConfig, OrganisationHierarchyLink } from '../entities/organisation.entity'

// Binding authorities
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'
import { BADocument } from '../entities/ba-document.entity'
import { BABordereauConfig } from '../entities/ba-bordereau-config.entity'

// Participations and party entities
import { PartyEntity } from '../entities/party-entity.entity'
import { BindingAuthoritySectionParticipation, QuoteSectionParticipation, PolicySectionParticipation } from '../entities/participation.entity'

// Ratings and locations
import { RatingSchedule, RatingRule, LocationPremiumCalculation, LocationPremiumAdjustment, RatingScheduleBindingAuthority } from '../entities/rating.entity'
import { Location, LocationCoverage, LocationsScheduleVersion, PolicyLocationScheduleRow } from '../entities/location.entity'

// Notifications
import { Notification } from '../entities/notification.entity'
import { ChatMessage, NotificationMessage, NotificationTemplate, UserNotification } from '../entities/notification-extras.entity'

// Lookups
import {
  LookupSubmissionStatus, LookupQuoteStatus, LookupPolicyStatus, LookupBindingAuthorityStatus,
  LookupContractType, LookupMethodOfPlacement, LookupRenewalStatus, LookupTransactionType,
  LookupLossQualifier, LookupClaimStatus, LookupClassOfBusiness, LookupBasisForOrder,
  LookupAnalysisBasis, LookupDateBasis, LookupWorkflowStatus, LookupPartyRole,
  LookupCoverage, LookupCoverageDetailType, LookupCoverageDetailSubType,
  LookupCurrency, LookupCountry, LookupRegion, LookupSubdivision,
  LookupSicCode, LookupRiskCode, LookupClassRiskCode, LookupTaxRule,
  SystemErrorCatalog,
} from '../entities/lookup.entity'

// Auth and security
import { PasswordResetToken, PasswordAuditLog, ErrorLog } from '../entities/auth-security.entity'

// Audit
import { AuditEvent } from '../entities/audit-event.entity'

// Submission extras
import { SubmissionRelated, SubmissionEditLock } from '../entities/submission-extras.entity'

// Quote extras
import { QuoteSectionRiskCode } from '../entities/quote-section-risk-code.entity'

// Measures
import { MeasureDefinition } from '../measures/measure-definition.entity'
import { MeasureDefinitionHistory } from '../entities/measure-definition-history.entity'

// Claims
import { Claim } from '../entities/claim.entity'

// Resolve .env.local from workspace root (4 levels up from backend/nest/src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })

const shouldUseDatabaseSsl = process.env.DATABASE_SSL === 'true'

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned',

  // All registered entities — TypeORM entity files are the single source of truth for schema
  entities: [
    // Core domain
    User, Party, Submission, Quote, QuoteSection, Policy,
    PolicySection, PolicyTransaction,
    PolicySectionCoverage, QuoteSectionCoverage,
    Claim,

    // Reporting and finance
    ReportTemplate, ReportExecutionHistory,
    FinanceCashBatch, FinanceInvoice, FinancePayment,
    PolicySectionTransaction, BASectionTransaction,

    // Workflow and org
    ClearanceSubmission, DataQualityIssue,
    ClearanceQueue,
    OrganisationHierarchy, OrganisationEntity, OrganisationHierarchyConfig, OrganisationHierarchyLink,

    // Binding authorities
    BindingAuthority, BASection, BATransaction,
    BASectionParticipation, BASectionAuthorizedRisk,
    BADocument, BABordereauConfig,

    // Participations and party entities
    PartyEntity,
    BindingAuthoritySectionParticipation, QuoteSectionParticipation, PolicySectionParticipation,

    // Rating and locations
    RatingSchedule, RatingRule,
    LocationPremiumCalculation, LocationPremiumAdjustment,
    RatingScheduleBindingAuthority,
    Location, LocationCoverage, LocationsScheduleVersion, PolicyLocationScheduleRow,

    // Notifications
    Notification, ChatMessage, NotificationMessage, NotificationTemplate, UserNotification,

    // Lookups (27 tables)
    LookupSubmissionStatus, LookupQuoteStatus, LookupPolicyStatus, LookupBindingAuthorityStatus,
    LookupContractType, LookupMethodOfPlacement, LookupRenewalStatus, LookupTransactionType,
    LookupLossQualifier, LookupClaimStatus, LookupClassOfBusiness, LookupBasisForOrder,
    LookupAnalysisBasis, LookupDateBasis, LookupWorkflowStatus, LookupPartyRole,
    LookupCoverage, LookupCoverageDetailType, LookupCoverageDetailSubType,
    LookupCurrency, LookupCountry, LookupRegion, LookupSubdivision,
    LookupSicCode, LookupRiskCode, LookupClassRiskCode, LookupTaxRule,
    SystemErrorCatalog,

    // Auth and security
    PasswordResetToken, PasswordAuditLog, ErrorLog,

    // Audit
    AuditEvent,

    // Submission extras
    SubmissionRelated, SubmissionEditLock,

    // Quote extras
    QuoteSectionRiskCode,

    // Measures
    MeasureDefinition, MeasureDefinitionHistory,
  ],

  // NEVER synchronize automatically — use db-sync.ts for fresh installs only
  synchronize: false,

  // Migration files live in src/migrations/ — one file per release for production schema changes
  // ts-node (dev/CLI) handles .ts; compiled dist handles .js
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],

  // Run any pending migrations automatically on server startup
  // Migrations use CREATE TABLE IF NOT EXISTS / ALTER TABLE IF NOT EXISTS so re-runs are safe
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

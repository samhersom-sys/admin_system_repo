import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { SubmissionsModule } from './submissions/submissions.module'
import { QuotesModule } from './quotes/quotes.module'
import { PoliciesModule } from './policies/policies.module'
import { PartiesModule } from './parties/parties.module'
import { AuditModule } from './audit/audit.module'
import { SearchModule } from './search/search.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { SettingsModule } from './settings/settings.module'
import { ReportingModule } from './reporting/reporting.module'
import { FinanceModule } from './finance/finance.module'
import { WorkflowModule } from './workflow/workflow.module'
import { BindingAuthoritiesModule } from './binding-authorities/binding-authorities.module'
import { RatingSchedulesModule } from './rating-schedules/rating-schedules.module'
import { OrganisationModule } from './organisation/organisation.module'
import { ClaimsModule } from './claims/claims.module'
import { LocationsModule } from './locations/locations.module'
import { HealthController } from './health.controller'
import { typeOrmOptions } from './config/typeorm.config'

/**
 * AppModule — root module.
 *
 * All feature modules use TypeORM exclusively (DatabaseModule fully retired).
 * Phase 2 migration complete — TypeOrmModule.forRoot() is the sole DB provider.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmOptions),
    AuthModule,
    SubmissionsModule,
    QuotesModule,
    PoliciesModule,
    PartiesModule,
    AuditModule,
    SearchModule,
    DashboardModule,
    SettingsModule,
    ReportingModule,
    FinanceModule,
    WorkflowModule,
    BindingAuthoritiesModule,
    RatingSchedulesModule,
    OrganisationModule,
    ClaimsModule,
    LocationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }

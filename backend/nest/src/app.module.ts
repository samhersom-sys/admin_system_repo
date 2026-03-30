import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { SubmissionsModule } from './submissions/submissions.module'
import { QuotesModule } from './quotes/quotes.module'
import { PartiesModule } from './parties/parties.module'
import { AuditModule } from './audit/audit.module'
import { SearchModule } from './search/search.module'
import { DashboardModule } from './dashboard/dashboard.module'
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
    PartiesModule,
    AuditModule,
    SearchModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

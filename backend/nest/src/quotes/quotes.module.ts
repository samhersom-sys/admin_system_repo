import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QuotesController } from './quotes.controller'
import { QuotesService } from './quotes.service'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { AuditModule } from '../audit/audit.module'
import { SubmissionsModule } from '../submissions/submissions.module'

@Module({
    imports: [TypeOrmModule.forFeature([Quote, QuoteSection]), AuditModule, SubmissionsModule],
    controllers: [QuotesController],
    providers: [QuotesService],
})
export class QuotesModule { }

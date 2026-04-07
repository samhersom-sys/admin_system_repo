import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportingController } from './reporting.controller'
import { ReportingService } from './reporting.service'
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'

@Module({
    imports: [TypeOrmModule.forFeature([ReportTemplate, ReportExecutionHistory])],
    controllers: [ReportingController],
    providers: [ReportingService],
    exports: [ReportingService],
})
export class ReportingModule { }
